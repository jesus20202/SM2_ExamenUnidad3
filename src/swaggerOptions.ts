import { SwaggerOptions } from 'swagger-jsdoc';

const options: SwaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Api Backend NodeJs',
      version: '1.0.0',
      description: 'Documentación de la API',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/authRoutes.ts'], 
};

export default options;
