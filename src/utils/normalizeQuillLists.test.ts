import { describe, it, expect } from 'vitest';
import { normalizeQuillLists } from './normalizeQuillLists';

describe('normalizeQuillLists', () => {
  it('passes through HTML with no lists unchanged', () => {
    const html = '<p>Hello world</p>';
    expect(normalizeQuillLists(html)).toBe(html);
  });

  it('passes through standard lists without Quill classes', () => {
    const html = '<ol><li>One</li><li>Two</li></ol>';
    expect(normalizeQuillLists(html)).toBe(html);
  });

  it('converts ql-indent-1 items into nested sub-lists', () => {
    const input = [
      '<ol>',
      '<li>First</li>',
      '<li class="ql-indent-1">Sub A</li>',
      '<li class="ql-indent-1">Sub B</li>',
      '<li>Second</li>',
      '</ol>',
    ].join('');

    const result = normalizeQuillLists(input);
    expect(result).toBe(
      '<ol><li>First<ol><li>Sub A</li><li>Sub B</li></ol></li><li>Second</li></ol>',
    );
  });

  it('handles mixed ordered/bullet via data-list attribute', () => {
    const input = [
      '<ol>',
      '<li data-list="ordered">First</li>',
      '<li class="ql-indent-1" data-list="bullet">Bullet A</li>',
      '<li class="ql-indent-1" data-list="bullet">Bullet B</li>',
      '<li data-list="ordered">Second</li>',
      '</ol>',
    ].join('');

    const result = normalizeQuillLists(input);
    expect(result).toBe(
      '<ol><li>First<ul><li>Bullet A</li><li>Bullet B</li></ul></li><li>Second</li></ol>',
    );
  });

  it('handles two levels of indent', () => {
    const input = [
      '<ol>',
      '<li>Top</li>',
      '<li class="ql-indent-1">Child</li>',
      '<li class="ql-indent-2">Grandchild</li>',
      '</ol>',
    ].join('');

    const result = normalizeQuillLists(input);
    expect(result).toBe(
      '<ol><li>Top<ol><li>Child<ol><li>Grandchild</li></ol></li></ol></li></ol>',
    );
  });

  it('handles empty/null input', () => {
    expect(normalizeQuillLists('')).toBe('');
    expect(normalizeQuillLists(null as unknown as string)).toBe(null);
  });

  it('preserves surrounding HTML', () => {
    const input = '<p>Before</p><ol><li>One</li><li class="ql-indent-1">Sub</li></ol><p>After</p>';
    const result = normalizeQuillLists(input);
    expect(result).toBe(
      '<p>Before</p><ol><li>One<ol><li>Sub</li></ol></li></ol><p>After</p>',
    );
  });

  it('handles content with bold/links inside list items', () => {
    const input = [
      '<ol>',
      '<li><strong>Bold item</strong></li>',
      '<li class="ql-indent-1"><a href="https://example.com">Link</a></li>',
      '</ol>',
    ].join('');

    const result = normalizeQuillLists(input);
    expect(result).toBe(
      '<ol><li><strong>Bold item</strong><ol><li><a href="https://example.com">Link</a></li></ol></li></ol>',
    );
  });

  it('handles realistic Quill v2 output (all items in <ol> with data-list)', () => {
    const input = [
      '<ol>',
      '<li data-list="ordered"><strong>Come prepared: Think of a product or brand yourself</strong></li>',
      '<li data-list="bullet" class="ql-indent-1">Real or made-up: something you\'d enjoy photographing</li>',
      '<li data-list="bullet" class="ql-indent-1">Bring props or gear if it helps bring the idea to life</li>',
      '<li data-list="bullet" class="ql-indent-1">Need inspiration? <a href="https://example.com">Check out this list here</a>!</li>',
      '<li data-list="ordered"><strong>During the meetup: Form small teams</strong> (3–5 people)</li>',
      '<li data-list="ordered"><strong>Pitch your idea to your group</strong></li>',
      '<li data-list="bullet" class="ql-indent-1">Vote or mix ideas to choose <strong>one campaign</strong> concept</li>',
      '<li data-list="bullet" class="ql-indent-1">You will work out at least <strong>one idea</strong> in your group</li>',
      '<li data-list="ordered"><strong>Brainstorm a simple campaign concept</strong></li>',
      '<li data-list="bullet" class="ql-indent-1">Think of the mood, message and aesthetic</li>',
      '<li data-list="bullet" class="ql-indent-1">Optionally: create a mini moodboard or sketch a few shot ideas first</li>',
      '<li data-list="ordered"><strong>Go out there and shoot your campaign</strong></li>',
      '<li data-list="bullet" class="ql-indent-1">You can use gear, props and you can model amongst yourselves</li>',
      '<li data-list="ordered"><strong>Share your results with the group</strong></li>',
      '<li data-list="bullet" class="ql-indent-1">Take your photos, edit them, set them up in a little presentation or PDF</li>',
      '<li data-list="bullet" class="ql-indent-1">Think about how you would present your work to the client</li>',
      '</ol>',
    ].join('');

    const result = normalizeQuillLists(input);

    expect(result).toContain('<ol>');
    expect(result).toContain('<ul>');
    expect(result).toContain('</ul></li>');

    expect(result).not.toContain('data-list');
    expect(result).not.toContain('ql-indent');

    // All 6 ordered items must be in a single <ol> for continuous numbering
    const olCount = (result.match(/<ol>/g) || []).length;
    expect(olCount).toBe(1);

    // Each ordered item should have bullet sub-items nested as <ul> inside its <li>
    const ulCount = (result.match(/<ul>/g) || []).length;
    expect(ulCount).toBeGreaterThanOrEqual(5);
  });
});
