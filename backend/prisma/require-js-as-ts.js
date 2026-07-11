// Prisma's generated client uses `.js`-suffixed relative imports (correct
// for real ESM/NodeNext resolution against compiled output), but only the
// `.ts` source exists when run live through ts-node (no dist/ present).
// Retry any failed `.js` require as `.ts` before giving up.
const Module = require('module');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.endsWith('.js')) {
    try {
      return originalResolveFilename.call(
        this,
        request,
        parent,
        isMain,
        options,
      );
    } catch (error) {
      try {
        return originalResolveFilename.call(
          this,
          request.slice(0, -3) + '.ts',
          parent,
          isMain,
          options,
        );
      } catch {
        throw error;
      }
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
