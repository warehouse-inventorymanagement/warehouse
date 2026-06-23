import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Warehouse API',
      version: '1.0.0',
      description: `
# Warehouse Inventory Management API

This API allows you to programmatically manage your warehouse inventory, including items, categories, locations, and tags.

## Authentication

All endpoints require an API key. Include it in one of these ways:
- **Header**: \`X-API-Key: wh_your_api_key\`
- **Bearer Token**: \`Authorization: Bearer wh_your_api_key\`

## Rate Limiting

API requests are rate limited per key:
- **Default**: 60 requests/minute, 1000/hour, 10000/day
- **Custom limits**: Can be configured per API key

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Requests allowed per minute
- \`X-RateLimit-Remaining\`: Requests remaining in current window
- \`X-RateLimit-Reset\`: Unix timestamp when window resets

## Errors

The API uses standard HTTP status codes:
- \`200\`: Success
- \`201\`: Created
- \`400\`: Bad Request
- \`401\`: Unauthorized
- \`403\`: Forbidden
- \`404\`: Not Found
- \`429\`: Too Many Requests (rate limited)
- \`500\`: Internal Server Error

All responses follow this format:
\`\`\`json
{
  "success": true|false,
  "data": {...},
  "message": "Optional message"
}
\`\`\`
      `,
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key passed in X-API-Key header',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key passed as Bearer token (must start with wh_)',
        },
      },
      schemas: {
        Item: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            sku: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            quantity: { type: 'integer' },
            minQuantity: { type: 'integer' },
            category: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            location: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            tags: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  color: { type: 'string' },
                },
              },
            },
            primaryImage: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            icon: { type: 'string', nullable: true },
            parentId: { type: 'string', nullable: true },
            parent: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
        Location: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['location', 'room', 'zone', 'aisle', 'row', 'bay', 'shelf', 'bin', 'box'] },
            barcode: { type: 'string', nullable: true },
            parentId: { type: 'string', nullable: true },
          },
        },
        Tag: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            color: { type: 'string', description: 'Hex color code' },
          },
        },
        Webhook: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            events: {
              type: 'array',
              items: { type: 'string' },
              description: 'Events this webhook subscribes to',
            },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [
      { ApiKeyHeader: [] },
      { BearerAuth: [] },
    ],
  },
  apis: ['./src/routes/publicapi.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
