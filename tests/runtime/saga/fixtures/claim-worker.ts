// Child process used by the contention tests: claims one Saga and reports the outcome through its exit code.
import { claimExecution } from '../../../../src/runtime/saga/ownership';
import { CliSagaRefusalError } from '../../../../src/runtime/errors';

const [sagaRoot, sagaId, session] = process.argv.slice(2);
try {
  const owner = claimExecution(sagaRoot, sagaId, session);
  process.stdout.write(JSON.stringify({ ok: true, ownerSession: owner.ownerSession, token: owner.token }));
  process.exitCode = 0;
} catch (error) {
  if (error instanceof CliSagaRefusalError) {
    process.stdout.write(JSON.stringify({ ok: false, reasons: error.reasons }));
    process.exitCode = 1;
  } else {
    process.stderr.write(String(error));
    process.exitCode = 3;
  }
}
