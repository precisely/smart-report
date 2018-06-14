import { CodeError, ErrorType } from '../src/error';
describe('CodeError', function () {
  it('should construct correctly', function () {
    const error = new CodeError('There was an error', { lineNumber: 3, columnNumber: 4}, ErrorType.BadIndentation);
    expect(error.location.lineNumber).toBe(3);
    expect(error.location.columnNumber).toBe(4);
    expect(error.message).toEqual('There was an error at 3:4');
  });
});
