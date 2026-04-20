import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import { truncateContent } from "../content-limits"

describe("truncateContent", () => {
	it("returns original content when under the limit", () => {
		const content = "hello world"
		assert.equal(truncateContent(content, 50), content)
	})

	it("keeps both the head and tail sections when truncating", () => {
		const content = `HEAD-LINE\n${"a".repeat(120)}\nTAIL-LINE`
		const result = truncateContent(content, 80)

		assert.ok(result.includes("HEAD-LINE"))
		assert.ok(result.includes("TAIL-LINE"))
		assert.ok(result.includes("[FILE TRUNCATED:"))
	})

	it("adds keyword snippets for error-like lines when possible", () => {
		const content = [
			"start",
			"info: still running",
			"ERROR: failed to connect",
			"stack trace line",
			"end",
			"x".repeat(400),
		].join("\n")
		const result = truncateContent(content, 220)

		assert.ok(result.includes("[PRIORITY MATCH SNIPPETS]"))
		assert.ok(result.toLowerCase().includes("error: failed to connect"))
	})
})
