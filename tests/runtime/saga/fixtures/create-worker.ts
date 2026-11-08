// Child process used by the creation tests: creates one Saga and reports the outcome through its exit code.
import { createSagaNatively } from '../../../../src/runtime/saga/create';

const [sagaRoot, sagaId] = process.argv.slice(2);
try {
  createSagaNatively(sagaId, sagaRoot);
  process.exitCode = 0;
} catch (error) {
  process.stderr.write(String((error as Error).message));
  process.exitCode = 1;
}
