/**
 * Content size limits to prevent massive files/responses from bricking conversations.
 * 400KB ≈ ~100,000 tokens, which is a reasonable limit for context.
 */

/** Maximum content size in bytes (400KB) */
export const MAX_CONTENT_SIZE_BYTES = 400 * 1024
const ERROR_CONTEXT_LINE_WINDOW = 2
const MAX_KEYWORD_MATCH_LINES = 12

const PRIORITY_KEYWORDS = [
	"error",
	"exception",
	"traceback",
	"failed",
	"failure",
	"fatal",
	"panic",
	"segmentation fault",
	"syntaxerror",
	"typeerror",
	"referenceerror",
]

/**
 * Format bytes into a human-readable string (e.g., "1.5 MB", "400 KB").
 */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Truncate content if it exceeds the maximum size limit.
 * Shows a balanced excerpt (head/tail + priority keyword snippets) with a truncation notice.
 *
 * @param content The content to potentially truncate
 * @param maxSize Maximum size in bytes (defaults to MAX_CONTENT_SIZE_BYTES)
 * @returns The original content if under limit, or truncated content with message at end
 */
export function truncateContent(content: string, maxSize: number = MAX_CONTENT_SIZE_BYTES): string {
	if (content.length <= maxSize) {
		return content
	}

	const headSize = Math.floor(maxSize * 0.45)
	const tailSize = Math.floor(maxSize * 0.45)
	const snippetBudget = Math.max(maxSize - headSize - tailSize, 0)
	const truncatedHead = content.slice(0, headSize)
	const truncatedTail = content.slice(-tailSize)
	const truncatedAmount = content.length - maxSize
	const keywordSnippets = extractKeywordSnippets(content, snippetBudget)

	const sections = [truncatedHead]
	if (keywordSnippets) {
		sections.push(keywordSnippets)
	}
	sections.push(truncatedTail)
	const truncatedContent = sections.join("\n\n...\n\n")

	return `${truncatedContent}\n\n---\n\n[FILE TRUNCATED: This content is ${formatBytes(content.length)}. A ${formatBytes(maxSize)} excerpt is shown (head/tail plus priority matches), and ${formatBytes(truncatedAmount)} was omitted. Use search_files to find specific patterns, or execute_command with grep/head/tail for targeted reading.]`
}

function extractKeywordSnippets(content: string, snippetBudget: number): string {
	if (snippetBudget < 100) {
		return ""
	}

	const lines = content.split("\n")
	const lowerLines = lines.map((line) => line.toLowerCase())
	const picked = new Set<number>()

	for (let i = 0; i < lowerLines.length; i++) {
		if (PRIORITY_KEYWORDS.some((kw) => lowerLines[i].includes(kw))) {
			const start = Math.max(0, i - ERROR_CONTEXT_LINE_WINDOW)
			const end = Math.min(lines.length - 1, i + ERROR_CONTEXT_LINE_WINDOW)
			for (let j = start; j <= end; j++) {
				picked.add(j)
			}
			if (picked.size >= MAX_KEYWORD_MATCH_LINES) {
				break
			}
		}
	}

	if (picked.size === 0) {
		return ""
	}

	const snippetLines = [...picked].sort((a, b) => a - b).map((lineIndex) => lines[lineIndex])
	const snippetText = snippetLines.join("\n")
	const clipped = snippetText.length > snippetBudget ? snippetText.slice(0, snippetBudget) : snippetText
	return `[PRIORITY MATCH SNIPPETS]\n${clipped}`
}
