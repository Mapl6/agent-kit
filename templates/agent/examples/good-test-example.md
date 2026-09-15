# Example: A Good Test

This shows the expected shape/style for tests in this repo. Replace with a real
example from your codebase.

```ts
describe('calculateTotal', () => {
  it('sums item prices correctly', () => {
    const items = [{ price: 10 }, { price: 20 }];
    expect(calculateTotal(items)).toBe(30);
  });

  it('returns 0 for an empty cart', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('throws on negative prices', () => {
    expect(() => calculateTotal([{ price: -5 }])).toThrow();
  });
});
```

**Why this is a good example:**
- Covers happy path + edge case + error case
- Descriptive test names (behavior, not implementation)
- No mocking of things that don't need mocking
