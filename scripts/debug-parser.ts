/**
 * Debug script to understand XML structure
 */

import { XMLParser } from "fast-xml-parser";

// Test empty string handling
const emptyXml = "";

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
});

console.log("Testing empty XML string:");
try {
  const result = parser.parse(emptyXml);
  console.log('Parsed "successfully":', JSON.stringify(result, null, 2));
} catch (e) {
  console.log('Parse error:', e);
}
console.log("\n");

// Test completely invalid XML
const invalidXml = "this is not xml at all <>>";
console.log("Testing completely invalid XML:");
try {
  const result = parser.parse(invalidXml);
  console.log('Parsed "successfully":', JSON.stringify(result, null, 2));
} catch (e) {
  console.log('Parse error:', e);
}
console.log("\n");
