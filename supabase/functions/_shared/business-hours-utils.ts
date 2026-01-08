/**
 * Business Hours SLA Calculator for Colombian Working Hours
 * 
 * - Working hours: 8:00 AM - 6:00 PM (10 hours per day)
 * - Working days: Monday to Friday
 * - Excludes Colombian holidays from colombian_holidays table
 */

export interface BusinessHoursConfig {
  workDayStartHour: number; // 8
  workDayEndHour: number;   // 18
  workHoursPerDay: number;  // 10
}

const DEFAULT_CONFIG: BusinessHoursConfig = {
  workDayStartHour: 8,
  workDayEndHour: 18,
  workHoursPerDay: 10
};

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if a date is a Colombian holiday
 */
function isHoliday(date: Date, holidays: string[]): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return holidays.includes(dateStr);
}

/**
 * Check if current time is within working hours
 */
function isWithinWorkingHours(date: Date, config: BusinessHoursConfig): boolean {
  const hour = date.getHours();
  return hour >= config.workDayStartHour && hour < config.workDayEndHour;
}

/**
 * Get the next working day start time
 */
function getNextWorkDayStart(date: Date, holidays: string[], config: BusinessHoursConfig): Date {
  const result = new Date(date);
  result.setHours(config.workDayStartHour, 0, 0, 0);
  
  // Move to next day
  result.setDate(result.getDate() + 1);
  
  // Skip weekends and holidays
  while (isWeekend(result) || isHoliday(result, holidays)) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
}

/**
 * Calculate remaining working hours in current day
 */
function getRemainingHoursToday(date: Date, config: BusinessHoursConfig): number {
  const hour = date.getHours();
  const minutes = date.getMinutes();
  
  if (hour < config.workDayStartHour) {
    return config.workHoursPerDay;
  }
  
  if (hour >= config.workDayEndHour) {
    return 0;
  }
  
  const remainingHours = config.workDayEndHour - hour - (minutes / 60);
  return Math.max(0, remainingHours);
}

/**
 * Calculate SLA deadline based on business hours
 * 
 * @param startDate - When the SLA timer starts
 * @param slaHours - Number of business hours for SLA
 * @param holidays - Array of holiday dates in 'YYYY-MM-DD' format
 * @param config - Business hours configuration
 * @returns Deadline date
 */
export function calculateBusinessHoursDeadline(
  startDate: Date,
  slaHours: number,
  holidays: string[],
  config: BusinessHoursConfig = DEFAULT_CONFIG
): Date {
  let currentDate = new Date(startDate);
  let remainingHours = slaHours;
  
  // If starting outside working hours or on non-working day, move to next working period
  if (isWeekend(currentDate) || isHoliday(currentDate, holidays)) {
    currentDate = getNextWorkDayStart(currentDate, holidays, config);
  } else if (!isWithinWorkingHours(currentDate, config)) {
    const hour = currentDate.getHours();
    if (hour < config.workDayStartHour) {
      // Before work starts, set to work start time
      currentDate.setHours(config.workDayStartHour, 0, 0, 0);
    } else {
      // After work ends, move to next working day
      currentDate = getNextWorkDayStart(currentDate, holidays, config);
    }
  }
  
  // Calculate deadline by adding business hours
  while (remainingHours > 0) {
    // Skip non-working days
    if (isWeekend(currentDate) || isHoliday(currentDate, holidays)) {
      currentDate = getNextWorkDayStart(currentDate, holidays, config);
      continue;
    }
    
    const hoursAvailableToday = getRemainingHoursToday(currentDate, config);
    
    if (remainingHours <= hoursAvailableToday) {
      // SLA completes today
      currentDate.setTime(currentDate.getTime() + remainingHours * 60 * 60 * 1000);
      remainingHours = 0;
    } else {
      // Use up today's hours and continue to next day
      remainingHours -= hoursAvailableToday;
      currentDate = getNextWorkDayStart(currentDate, holidays, config);
    }
  }
  
  return currentDate;
}

/**
 * Fetch Colombian holidays from database
 */
export async function fetchColombianHolidays(supabase: any): Promise<string[]> {
  const currentYear = new Date().getFullYear();
  
  const { data, error } = await supabase
    .from('colombian_holidays')
    .select('fecha')
    .gte('year', currentYear)
    .lte('year', currentYear + 1);
  
  if (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
  
  return (data || []).map((h: { fecha: string }) => h.fecha);
}

/**
 * Get working hours config from system_config
 */
export async function getWorkingHoursConfig(supabase: any): Promise<BusinessHoursConfig> {
  const { data, error } = await supabase
    .from('system_config')
    .select('config_key, config_value')
    .in('config_key', ['calendar_working_hours_start', 'calendar_working_hours_end']);
  
  if (error || !data) {
    console.log('Using default working hours config');
    return DEFAULT_CONFIG;
  }
  
  const configMap = new Map(data.map((c: any) => [c.config_key, c.config_value]));
  
  const startHour = parseInt(String(configMap.get('calendar_working_hours_start') || '08:00').split(':')[0], 10);
  const endHour = parseInt(String(configMap.get('calendar_working_hours_end') || '18:00').split(':')[0], 10);
  
  return {
    workDayStartHour: startHour,
    workDayEndHour: endHour,
    workHoursPerDay: endHour - startHour
  };
}

/**
 * Main function to calculate SLA deadline with all context
 */
export async function calculateSLADeadline(
  supabase: any,
  startDate: Date,
  slaHours: number
): Promise<Date> {
  const [holidays, config] = await Promise.all([
    fetchColombianHolidays(supabase),
    getWorkingHoursConfig(supabase)
  ]);
  
  console.log(`📅 Calculating SLA: ${slaHours} business hours from ${startDate.toISOString()}`);
  console.log(`⏰ Working hours: ${config.workDayStartHour}:00 - ${config.workDayEndHour}:00`);
  console.log(`🎉 Holidays loaded: ${holidays.length}`);
  
  const deadline = calculateBusinessHoursDeadline(startDate, slaHours, holidays, config);
  
  console.log(`✅ SLA deadline calculated: ${deadline.toISOString()}`);
  
  return deadline;
}
