{
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "triggerAtHour": 8
            }
          ]
        }
      },
      "id": "a2bac56c-ca08-41ba-aab6-7e75ef128bb3",
      "name": "Daily 8AM UTC",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [
        -1104,
        208
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://formd-scout.vercel.app/api/edgar/ingest",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-api-key",
              "value": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"startDate\": \"{{ $now.minus(1, 'day').toFormat('yyyy-MM-dd') }}\",\n  \"endDate\": \"{{ $now.toFormat('yyyy-MM-dd') }}\"\n}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "json"
            }
          },
          "timeout": 120000
        }
      },
      "id": "428642fe-9539-4f8a-b6b2-ba89ef3ec43c",
      "name": "Ingest Form D Filings",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        -880,
        208
      ],
      "retryOnFail": true,
      "maxTries": 3,
      "waitBetweenTries": 5000
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "check-ingested",
              "leftValue": "={{ $json.ingested }}",
              "rightValue": 0,
              "operator": {
                "type": "number",
                "operation": "gt"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "ea67adc6-cfd7-4c1e-950b-6eceb674bb74",
      "name": "New Filings?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        -656,
        208
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://formd-scout.vercel.app/api/edgar/enrich",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-api-key",
              "value": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "{}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "json"
            }
          },
          "timeout": 300000
        }
      },
      "id": "93fd638b-ac6b-4ff5-b5af-b73f2d05331f",
      "name": "AI Enrich Filings",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        -448,
        112
      ],
      "retryOnFail": true,
      "maxTries": 2,
      "waitBetweenTries": 5000
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "more-to-enrich",
              "leftValue": "={{ $json.enriched }}",
              "rightValue": 9,
              "operator": {
                "type": "number",
                "operation": "gte"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "78245798-3077-4433-bc91-0a1bc1b6d329",
      "name": "More to Enrich?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        -224,
        112
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://formd-scout.vercel.app/api/edgar/enrich",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-api-key",
              "value": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "{}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "json"
            }
          },
          "timeout": 300000
        }
      },
      "id": "9d2d247f-6758-47d2-b11c-4ede77c18334",
      "name": "Enrich Batch 2",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        0,
        0
      ],
      "retryOnFail": true,
      "maxTries": 2,
      "waitBetweenTries": 5000
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://formd-scout.vercel.app/api/edgar/enrich",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-api-key",
              "value": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "{}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "json"
            }
          },
          "timeout": 300000
        }
      },
      "id": "2c338976-3eff-45b0-a5a0-db6c58d69d2e",
      "name": "Enrich Batch 3",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        224,
        0
      ],
      "retryOnFail": true,
      "maxTries": 2,
      "waitBetweenTries": 10000
    },
    {
      "parameters": {
        "options": {}
      },
      "id": "d95015a6-c969-4ed3-b2a3-d9d21695799e",
      "name": "Build Summary",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        448,
        112
      ]
    },
    {
      "parameters": {
        "options": {}
      },
      "id": "fc300d02-0694-46f5-b992-b46c1359d4aa",
      "name": "Log: No New Filings",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        -448,
        320
      ]
    },
    {
      "parameters": {
        "content": "\nDaily SEC Ingestion & Enrichment\n\nRuns every weekday at 8 AM UTC (3 AM EST)\n1. Ingest — Pulls new Form D filings from the SEC website (yesterday + today). These are funding disclosures that appear 2–3 weeks before press releases.\n2. Check — If new filings found → enrich. If none → stop.\n3. Enrich — AI scores each filing 1–100 for relevance as a commercial real estate lead (tech companies likely needing NYC office space). Runs in batches of 10.\n4. Summary — Logs ingestion + enrichment counts.",
        "height": 256,
        "width": 608
      },
      "type": "n8n-nodes-base.stickyNote",
      "position": [
        -240,
        272
      ],
      "typeVersion": 1,
      "id": "120b7d00-9834-41f6-a077-094d3568c801",
      "name": "Sticky Note"
    }
  ],
  "connections": {
    "Daily 8AM UTC": {
      "main": [
        [
          {
            "node": "Ingest Form D Filings",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Ingest Form D Filings": {
      "main": [
        [
          {
            "node": "New Filings?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "New Filings?": {
      "main": [
        [
          {
            "node": "AI Enrich Filings",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Log: No New Filings",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "AI Enrich Filings": {
      "main": [
        [
          {
            "node": "More to Enrich?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "More to Enrich?": {
      "main": [
        [
          {
            "node": "Enrich Batch 2",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Build Summary",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Enrich Batch 2": {
      "main": [
        [
          {
            "node": "Enrich Batch 3",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Enrich Batch 3": {
      "main": [
        [
          {
            "node": "Build Summary",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "instanceId": "2221f298da57396f5606c32519dd53744c4c25aad4e048716f8a0d85e0ee9820"
  }
}