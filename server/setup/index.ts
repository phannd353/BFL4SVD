import { setupAdmin } from './admin';
import { setupModel } from './model';

Promise.allSettled([setupAdmin(), setupModel()]).then((results) => {
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error('Error setting up application data:', failure.reason);
    }
    process.exit(1);
  }
  process.exit(0);
});
