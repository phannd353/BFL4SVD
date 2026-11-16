// Fetcher function for SWR
export const swrFetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include',
  });
  const resData = await res.json();

  if (!res.ok) {
    throw new Error(resData.message || 'Failed to fetch data');
  }

  return resData;
};
