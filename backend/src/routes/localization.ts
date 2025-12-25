/**
 * Localization Routes
 * Handles translation and localization endpoints
 */

import { Router } from 'express';
import { translateContent, getTranslatedContent, getUITranslation, translateUIStrings } from '../lib/localization/translationService';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Get translated content
 */
router.get('/content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { language = 'en' } = req.query;

    const translations = await getTranslatedContent(contentId, language as string);
    res.json(translations);
  } catch (error: any) {
    console.error('Error getting translated content:', error);
    res.status(500).json({ error: 'Failed to get translations' });
  }
});

/**
 * Get UI translation
 */
router.get('/ui/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { language = 'en' } = req.query;

    const translation = await getUITranslation(key, language as string);
    res.json({ translation: translation || key });
  } catch (error: any) {
    console.error('Error getting UI translation:', error);
    res.status(500).json({ error: 'Failed to get translation' });
  }
});

/**
 * Request content translation (admin/creator only)
 */
router.post('/content/:contentId/translate', authenticate, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { languages } = req.body;

    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return res.status(400).json({ error: 'Languages array is required' });
    }

    await translateContent(contentId, languages);
    res.json({ message: 'Translation queued successfully' });
  } catch (error: any) {
    console.error('Error requesting translation:', error);
    res.status(500).json({ error: 'Failed to queue translation' });
  }
});

/**
 * Batch translate UI strings (admin only)
 */
router.post('/ui/batch', authenticate, async (req, res) => {
  try {
    const { strings, language } = req.body;

    if (!strings || typeof strings !== 'object') {
      return res.status(400).json({ error: 'Strings object is required' });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ error: 'Target language is required' });
    }

    await translateUIStrings(strings, language);
    res.json({ message: 'Batch translation completed' });
  } catch (error: any) {
    console.error('Error in batch translation:', error);
    res.status(500).json({ error: 'Failed to complete batch translation' });
  }
});

export default router;
