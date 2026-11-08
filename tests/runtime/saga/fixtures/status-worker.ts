// Child process used by the atomicity tests: writes the same Saga status snapshot repeatedly.
import { setStatus } from '../../../../src/runtime/saga/statusWrite';

const [sagaRoot, sagaId, state, iterations] = process.argv.slice(2);
for (let index = 0; index < Number(iterations); index += 1) {
  setStatus(sagaRoot, sagaId, state, `${state} ${index}`);
}
