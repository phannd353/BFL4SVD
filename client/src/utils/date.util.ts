const toVnDateString = (date: string) => {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const toVnDateTimeString = (date: string | Date) => {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
  });
};

const calHourDiff = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  return Math.abs((endDate.getTime() - startDate.getTime()) / 36e5).toFixed(2);
};

const calTimeDiff = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  return endDate.getTime() - startDate.getTime();
};

const shortenPeriod = (period: number) => {
  const units = ['phút', 'giờ', 'ngày', 'tuần', 'tháng'];
  const thresholds = [60000, 60, 24, 7, 30]; // seconds in each unit
  let unitIndex = 0;
  let value = period;
  while (unitIndex < thresholds.length && value >= thresholds[unitIndex]) {
    value /= thresholds[unitIndex];
    unitIndex++;
  }
  return `${Math.round(value)} ${units[unitIndex - 1]}`;
};

// Format date using format string
const formatDate = (dateString?: string, format: string = 'DD/MM/YYYY') => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';

  // Get date components
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  // Get day of week in Vietnamese
  const weekdays = [
    'Chủ Nhật',
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
  ];
  const dayOfWeek = weekdays[date.getDay()];

  // Replace format patterns
  return format
    .replace('dddd', dayOfWeek)
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year.toString())
    .replace('HH', hours)
    .replace('mm', minutes);
};

export {
  toVnDateString,
  toVnDateTimeString,
  calHourDiff,
  calTimeDiff,
  formatDate,
  shortenPeriod,
};
