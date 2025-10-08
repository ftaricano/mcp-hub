// Jest setup file for MCP Hub tests

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'ERROR'; // Only show errors during tests

// Mock external dependencies
global.fetch = jest.fn();

// Add custom matchers if needed
expect.extend({
  toBeValidTool(received) {
    const pass = received && 
                 typeof received.name === 'string' &&
                 typeof received.description === 'string' &&
                 typeof received.execute === 'function';
    
    return {
      pass,
      message: () => pass 
        ? `expected ${received} not to be a valid tool`
        : `expected ${received} to be a valid tool with name, description, and execute function`
    };
  }
});

// Increase timeout for integration tests
if (process.env.INTEGRATION_TEST) {
  jest.setTimeout(30000);
}