import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── VAPID helpers using Web Crypto API ──

async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKey: base64UrlEncode(new Uint8Array(publicKeyRaw)),
    privateKey: privateKeyJwk.d!,
  };
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Web Push encryption (RFC 8291) ──

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<boolean> {
  try {
    // Import VAPID private key
    const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
    const publicKeyBytes = base64UrlDecode(vapidPublicKey);

    // Create VAPID JWT
    const vapidToken = await createVapidJwt(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      vapidSubject
    );

    // Encrypt payload using Web Push encryption
    const encrypted = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );

    // Send the push message
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${vapidToken.token}, k=${vapidPublicKey}`,
      },
      body: encrypted,
    });

    if (response.status === 201 || response.status === 200) {
      console.log('[push] Push sent successfully');
      return true;
    }

    if (response.status === 410 || response.status === 404) {
      console.log('[push] Subscription expired/invalid');
      return false;
    }

    const errorText = await response.text();
    console.error(`[push] Push failed: ${response.status} - ${errorText}`);
    return false;
  } catch (err) {
    console.error('[push] Error sending push:', err);
    return false;
  }
}

async function createVapidJwt(
  endpoint: string,
  publicKey: string,
  privateKey: string,
  subject: string
): Promise<{ token: string }> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: expiration, sub: subject };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key for signing
  const privateKeyJwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKey,
    x: '', // Will be derived
    y: '',
  };

  // Decode public key to get x, y coordinates
  const pubKeyBytes = base64UrlDecode(publicKey);
  // Uncompressed format: 0x04 || x (32 bytes) || y (32 bytes)
  if (pubKeyBytes[0] === 0x04 && pubKeyBytes.length === 65) {
    privateKeyJwk.x = base64UrlEncode(pubKeyBytes.slice(1, 33));
    privateKeyJwk.y = base64UrlEncode(pubKeyBytes.slice(33, 65));
  }

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format if needed
  const signatureBytes = new Uint8Array(signatureBuffer);
  let rawSignature: Uint8Array;

  if (signatureBytes.length === 64) {
    rawSignature = signatureBytes;
  } else {
    // Already in raw format from WebCrypto
    rawSignature = signatureBytes;
  }

  const signatureB64 = base64UrlEncode(rawSignature);
  return { token: `${unsignedToken}.${signatureB64}` };
}

async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<Uint8Array> {
  const payloadBytes = new TextEncoder().encode(payload);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Import subscriber's public key
  const subscriberPubKey = await crypto.subtle.importKey(
    'raw',
    base64UrlDecode(p256dhKey),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPubKey },
    localKeyPair.privateKey,
    256
  );

  const authBytes = base64UrlDecode(authSecret);
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPubKeyBytes = new Uint8Array(localPublicKeyRaw);
  const subscriberPubKeyBytes = base64UrlDecode(p256dhKey);

  // RFC 8291 key derivation
  const ikm = new Uint8Array(sharedSecret);

  // PRK = HKDF-Extract(auth_secret, ecdh_secret)
  const prkKey = await crypto.subtle.importKey('raw', authBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, ikm));

  // Key info: "WebPush: info" || 0x00 || ua_public || as_public
  const keyInfoPrefix = new TextEncoder().encode('WebPush: info\0');
  const keyInfo = new Uint8Array(keyInfoPrefix.length + subscriberPubKeyBytes.length + localPubKeyBytes.length);
  keyInfo.set(keyInfoPrefix);
  keyInfo.set(subscriberPubKeyBytes, keyInfoPrefix.length);
  keyInfo.set(localPubKeyBytes, keyInfoPrefix.length + subscriberPubKeyBytes.length);

  // IKM for content encryption
  const contentIkm = await hkdfExpand(prk, keyInfo, 32);

  // Salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive CEK and nonce using salt
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');

  const prkContent = await hkdfExtract(salt, contentIkm);
  const cek = await hkdfExpand(prkContent, cekInfo, 16);
  const nonce = await hkdfExpand(prkContent, nonceInfo, 12);

  // Pad and encrypt payload
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Delimiter
  paddedPayload[payloadBytes.length + 1] = 0;

  const encryptionKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    encryptionKey,
    paddedPayload
  );

  const encryptedBytes = new Uint8Array(encrypted);

  // Build aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65) || encrypted
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, encryptedBytes.length + 86); // header + content
  const keyIdLen = new Uint8Array([65]); // length of local public key

  const result = new Uint8Array(16 + 4 + 1 + 65 + encryptedBytes.length);
  result.set(salt, 0);
  result.set(recordSize, 16);
  result.set(keyIdLen, 20);
  result.set(localPubKeyBytes, 21);
  result.set(encryptedBytes, 86);

  return result;
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const infoAndCounter = new Uint8Array(info.length + 1);
  infoAndCounter.set(info);
  infoAndCounter[info.length] = 1;
  const output = new Uint8Array(await crypto.subtle.sign('HMAC', key, infoAndCounter));
  return output.slice(0, length);
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log(`[push-notifications] Action: ${action}`);

    // ── Generate VAPID keys ──
    if (action === 'generate-keys') {
      // Check if keys already exist
      const { data: existingPublic } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'vapid_public_key')
        .maybeSingle();

      if (existingPublic?.config_value) {
        return new Response(JSON.stringify({
          success: true,
          publicKey: existingPublic.config_value,
          message: 'VAPID keys already exist'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const keys = await generateVapidKeys();

      // Store public key in system_config
      await supabase.from('system_config').upsert({
        config_key: 'vapid_public_key',
        config_value: keys.publicKey,
        description: 'VAPID public key for Web Push notifications'
      }, { onConflict: 'config_key' });

      // Store private key in system_config (protected by RLS)
      await supabase.from('system_config').upsert({
        config_key: 'vapid_private_key',
        config_value: keys.privateKey,
        description: 'VAPID private key for Web Push notifications (keep secret)'
      }, { onConflict: 'config_key' });

      console.log('[push-notifications] VAPID keys generated and stored');

      return new Response(JSON.stringify({
        success: true,
        publicKey: keys.publicKey,
        message: 'VAPID keys generated successfully'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Get public key ──
    if (action === 'get-public-key') {
      const { data } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'vapid_public_key')
        .maybeSingle();

      if (!data?.config_value) {
        return new Response(JSON.stringify({
          success: false,
          error: 'VAPID keys not generated. Call generate-keys first.'
        }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        success: true,
        publicKey: data.config_value
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Send push to a specific user ──
    if (action === 'send') {
      const { user_id, title, body, url, tag, notification_id } = params;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get VAPID keys
      const { data: vapidConfigs } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .in('config_key', ['vapid_public_key', 'vapid_private_key']);

      const vapidPublicKey = vapidConfigs?.find(c => c.config_key === 'vapid_public_key')?.config_value;
      const vapidPrivateKey = vapidConfigs?.find(c => c.config_key === 'vapid_private_key')?.config_value;

      if (!vapidPublicKey || !vapidPrivateKey) {
        return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get user's push subscriptions
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth, id')
        .eq('user_id', user_id);

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`[push-notifications] No push subscriptions for user ${user_id}`);
        return new Response(JSON.stringify({
          success: true,
          sent: 0,
          message: 'No push subscriptions found'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const payload = JSON.stringify({
        title: title || 'Praxis Hub',
        body: body || 'Nueva notificación',
        url: url || '/',
        tag: tag || 'praxis-hub',
        notification_id,
      });

      let sent = 0;
      const expiredIds: string[] = [];

      for (const sub of subscriptions) {
        const success = await sendWebPush(
          sub,
          payload,
          vapidPublicKey,
          vapidPrivateKey,
          'mailto:soporte@praxis-hub.co'
        );

        if (success) {
          sent++;
        } else {
          expiredIds.push(sub.id);
        }
      }

      // Clean up expired subscriptions
      if (expiredIds.length > 0) {
        await supabase.from('push_subscriptions').delete().in('id', expiredIds);
        console.log(`[push-notifications] Cleaned ${expiredIds.length} expired subscriptions`);
      }

      console.log(`[push-notifications] Sent ${sent}/${subscriptions.length} push notifications to user ${user_id}`);

      return new Response(JSON.stringify({
        success: true,
        sent,
        total: subscriptions.length,
        expired: expiredIds.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[push-notifications] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
