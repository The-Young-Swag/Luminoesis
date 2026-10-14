import { describe, expect, it } from 'vitest'

import { classifyDocumentInfo } from '../tutorTopic'

describe('classifyDocumentInfo', () => {
  it.each([
    'Who authored this narrative report?',
    'Who wrote this document?',
    'Who is the author?',
    'Who prepared this report?',
    'Submitted by whom?',
    'author of this paper',
    'Who submitted this study?',
  ])('matches author lookups: %s', (question) => {
    expect(classifyDocumentInfo(question)).toBe('author')
  })

  it.each([
    "What's the title of this report?",
    'What is the title?',
    'What is this document called?',
    'title of your paper',
  ])('matches title lookups: %s', (question) => {
    expect(classifyDocumentInfo(question)).toBe('title')
  })

  it.each([
    'How many pages does this document have?',
    'What is the page count?',
    'number of pages in this report?',
    'How long is this paper?',
  ])('matches page-count lookups: %s', (question) => {
    expect(classifyDocumentInfo(question)).toBe('pages')
  })

  it.each([
    "What is the author's main argument?",
    "Summarize the author's findings",
    'What does the author conclude?',
    'According to the author, why did this happen?',
    'Explain photosynthesis',
    'What page is the chart on?',
    '',
    '   ',
  ])('does not match content questions: %s', (question) => {
    expect(classifyDocumentInfo(question)).toBeNull()
  })
})
