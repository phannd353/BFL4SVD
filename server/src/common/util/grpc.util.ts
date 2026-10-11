export const TimestampUtil = {
  toTimestamp(date: Date | string | number) {
    if (!date) return undefined;
    if (typeof date === 'string' || typeof date === 'number') {
      date = new Date(date);
    }
    return {
      seconds: Math.floor(date.getTime() / 1000),
      nanos: (date.getTime() % 1000) * 1e6,
    };
  },

  toDate(ts: any) {
    if (!ts) return null;
    if (typeof ts === 'string') return new Date(ts);
    return new Date(ts.seconds * 1000 + ts.nanos / 1e6);
  },
};
