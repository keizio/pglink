import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as hbs from 'hbs';
import * as fs from 'fs';
import * as path from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
    rawBody: true,
    cors: {
      allowedHeaders: '*',
      origin: '*',
    },
  });

  app.setBaseViewsDir(join(__dirname, '..', 'views'));

  const partialsDir = join(__dirname, '..', 'views', 'partials', 'admin');
  const partials = fs.readdirSync(partialsDir);
  partials.forEach((partial) => {
    const partialName = 'admin/' + partial.replace('.hbs', '');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (hbs as any).handlebars.registerPartial(
      partialName,
      fs.readFileSync(path.join(partialsDir, partial), 'utf8'),
    );
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  app.engine('hbs', hbs.__express as never);
  app.setViewEngine('hbs');

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
