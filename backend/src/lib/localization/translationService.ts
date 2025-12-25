/**
 * Translation Service
 * Handles automatic and manual translations
 */

import { prisma } from '../prisma';

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'hi', 'ar'];

/**
 * Translate text using external API (placeholder - integrate with actual translation service)
 */
async function translateText(text: string, targetLanguage: string): Promise<string> {
  // TODO: Integrate with translation API (Google Translate, DeepL, Azure Translator, etc.)
  // For now, return placeholder
  console.log(`Translating "${text}" to ${targetLanguage}`);
  
  // Placeholder implementation
  // In production, use:
  // - Google Cloud Translation API
  // - DeepL API
  // - Azure Translator
  // - AWS Translate
  
  return text; // Return original for now
}

/**
 * Translate content metadata
 */
export async function translateContent(
  contentId: string,
  targetLanguages: string[]
): Promise<void> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      title: true,
      description: true,
    },
  });

  if (!content) {
    throw new Error('Content not found');
  }

  for (const lang of targetLanguages) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      console.warn(`Language ${lang} not supported, skipping`);
      continue;
    }

    // Check if translation exists
    const existingTitle = await prisma.translation.findUnique({
      where: {
        entityType_entityId_language_field: {
          entityType: 'content',
          entityId: contentId,
          language: lang,
          field: 'title',
        },
      },
    });

    const existingDesc = await prisma.translation.findUnique({
      where: {
        entityType_entityId_language_field: {
          entityType: 'content',
          entityId: contentId,
          language: lang,
          field: 'description',
        },
      },
    });

    // Translate title if not exists
    if (!existingTitle && content.title) {
      const translatedTitle = await translateText(content.title, lang);
      await prisma.translation.create({
        data: {
          entityType: 'content',
          entityId: contentId,
          language: lang,
          field: 'title',
          value: translatedTitle,
          translatedBy: 'auto',
        },
      });
    }

    // Translate description if not exists
    if (!existingDesc && content.description) {
      const translatedDesc = await translateText(content.description, lang);
      await prisma.translation.create({
        data: {
          entityType: 'content',
          entityId: contentId,
          language: lang,
          field: 'description',
          value: translatedDesc,
          translatedBy: 'auto',
        },
      });
    }
  }
}

/**
 * Get translated content
 */
export async function getTranslatedContent(
  contentId: string,
  language: string
): Promise<{ title?: string; description?: string }> {
  const translations = await prisma.translation.findMany({
    where: {
      entityType: 'content',
      entityId: contentId,
      language,
    },
  });

  const result: { title?: string; description?: string } = {};
  translations.forEach(t => {
    if (t.field === 'title') result.title = t.value;
    if (t.field === 'description') result.description = t.value;
  });

  return result;
}

/**
 * Get UI translation
 */
export async function getUITranslation(
  key: string,
  language: string
): Promise<string | null> {
  const translation = await prisma.translation.findFirst({
    where: {
      entityType: 'ui',
      entityId: key,
      language,
    },
  });

  return translation?.value || null;
}

/**
 * Batch translate UI strings
 */
export async function translateUIStrings(
  strings: Record<string, string>,
  targetLanguage: string
): Promise<void> {
  for (const [key, value] of Object.entries(strings)) {
    const existing = await prisma.translation.findUnique({
      where: {
        entityType_entityId_language_field: {
          entityType: 'ui',
          entityId: key,
          language: targetLanguage,
          field: 'text',
        },
      },
    });

    if (!existing) {
      const translated = await translateText(value, targetLanguage);
      await prisma.translation.create({
        data: {
          entityType: 'ui',
          entityId: key,
          language: targetLanguage,
          field: 'text',
          value: translated,
          translatedBy: 'auto',
        },
      });
    }
  }
}


