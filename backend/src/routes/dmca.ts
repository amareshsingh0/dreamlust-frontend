/**
 * DMCA Takedown Routes
 * Handles copyright infringement claims and content removal
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireModerator } from '../middleware/authorize';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError, NotFoundError } from '../lib/errors';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { cache } from '../lib/cache/cacheManager';
import { sendEmail } from '../lib/email/emailService';

const router = Router();

const dmcaClaimSchema = z.object({
  contentId: z.string().uuid(),
  claimantName: z.string().min(1).max(200),
  claimantEmail: z.string().email(),
  claimantAddress: z.string().min(1).max(500),
  claimantPhone: z.string().optional(),
  copyrightedWork: z.string().min(10).max(2000),
  infringementDescription: z.string().min(10).max(2000),
  goodFaithStatement: z.boolean().refine(val => val === true, {
    message: 'Good faith statement must be accepted',
  }),
  accuracyStatement: z.boolean().refine(val => val === true, {
    message: 'Accuracy statement must be accepted',
  }),
  authorizedStatement: z.boolean().refine(val => val === true, {
    message: 'Authorization statement must be accepted',
  }),
  signature: z.string().min(1).max(200),
  signatureDate: z.string().datetime(),
});

const counterNoticeSchema = z.object({
  dmcaClaimId: z.string().uuid(),
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  phone: z.string().optional(),
  email: z.string().email(),
  identificationOfContent: z.string().min(10).max(2000),
  statementOfGoodFaith: z.string().min(10).max(2000),
  consentToJurisdiction: z.boolean().refine(val => val === true),
  signature: z.string().min(1).max(200),
  signatureDate: z.string().datetime(),
});

/**
 * Submit DMCA takedown claim
 * POST /api/dmca/claim
 */
router.post(
  '/claim',
  validateBody(dmcaClaimSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;

    // Verify content exists
    const content = await prisma.content.findUnique({
      where: { id: data.contentId },
      include: {
        creator: true,
      },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Create DMCA claim record
    const dmcaClaim = await prisma.$executeRaw`
      INSERT INTO dmca_claims (
        id, contentId, claimant_name, claimant_email, claimant_address, 
        claimant_phone, copyrighted_work, infringement_description,
        good_faith_statement, accuracy_statement, authorized_statement,
        signature, signature_date, status, createdAt, updatedAt
      ) VALUES (
        gen_random_uuid(), ${data.contentId}, ${data.claimantName}, 
        ${data.claimantEmail}, ${data.claimantAddress}, ${data.claimantPhone || null},
        ${data.copyrightedWork}, ${data.infringementDescription},
        ${data.goodFaithStatement}, ${data.accuracyStatement}, ${data.authorizedStatement},
        ${data.signature}, ${data.signatureDate}::timestamp, 'pending',
        NOW(), NOW()
      )
      RETURNING *
    `;

    // Immediately suspend content pending review
    await prisma.content.update({
      where: { id: data.contentId },
      data: {
        status: 'ARCHIVED',
      },
    });

    // Create flag
    await prisma.contentFlag.create({
      data: {
        contentId: data.contentId,
        flagType: 'copyright',
        reason: 'DMCA takedown notice received',
        severity: 'high',
      },
    });

    // Invalidate cache
    await cache.invalidate([`content:${data.contentId}`]);

    // Notify creator
    if (content.creator.payoutEmail) {
      await sendEmail({
        to: content.creator.payoutEmail,
        subject: 'DMCA Copyright Claim Against Your Content',
        html: `<p>A DMCA copyright claim has been filed against your content: "${content.title}"</p>
               <p>Claimant: ${data.claimantName}</p>
               <p>Content ID: ${content.id}</p>
               <p>Your content has been temporarily suspended pending review.</p>`,
        text: `A DMCA copyright claim has been filed against your content: "${content.title}". Claimant: ${data.claimantName}`,
      }).catch(err => console.error('Failed to send DMCA email:', err));
    }

    // Notify admins
    const admins = await prisma.$queryRaw`
      SELECT email FROM users WHERE role = 'ADMIN' AND emailNotifications = true
    `;

    for (const admin of admins as any[]) {
      await sendEmail({
        to: admin.email,
        subject: 'New DMCA Takedown Claim',
        html: `<p>New DMCA takedown claim received</p>
               <p>Content ID: ${data.contentId}</p>
               <p>Claimant: ${data.claimantName}</p>
               <p>Please review in admin panel.</p>`,
        text: `New DMCA takedown claim for content ${data.contentId} from ${data.claimantName}`,
      }).catch(err => console.error('Failed to send admin notification:', err));
    }

    res.status(201).json({
      message: 'DMCA claim submitted successfully. Content has been suspended pending review.',
      claimId: dmcaClaim,
    });
  })
);

/**
 * Submit DMCA counter-notice
 * POST /api/dmca/counter-notice
 */
router.post(
  '/counter-notice',
  authenticate,
  validateBody(counterNoticeSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;
    const userId = req.user!.userId;

    // Verify claim exists and user owns the content
    const claim = await prisma.$queryRaw`
      SELECT dc.*, c.creatorId, cr.userId
      FROM dmca_claims dc
      JOIN content c ON dc.contentId = c.id
      JOIN creators cr ON c.creatorId = cr.id
      WHERE dc.id = ${data.dmcaClaimId}::uuid
    ` as any[];

    if (!claim || claim.length === 0) {
      throw new NotFoundError('DMCA claim not found');
    }

    if (claim[0].userId !== userId) {
      throw new ValidationError('You can only submit counter-notices for your own content');
    }

    // Create counter-notice
    await prisma.$executeRaw`
      INSERT INTO dmca_counter_notices (
        id, dmca_claim_id, name, address, phone, email,
        identification_of_content, statement_of_good_faith,
        consent_to_jurisdiction, signature, signature_date,
        status, createdAt, updatedAt
      ) VALUES (
        gen_random_uuid(), ${data.dmcaClaimId}::uuid, ${data.name},
        ${data.address}, ${data.phone || null}, ${data.email},
        ${data.identificationOfContent}, ${data.statementOfGoodFaith},
        ${data.consentToJurisdiction}, ${data.signature}, 
        ${data.signatureDate}::timestamp, 'pending', NOW(), NOW()
      )
    `;

    // Update claim status
    await prisma.$executeRaw`
      UPDATE dmca_claims 
      SET status = 'counter_notice_received', updatedAt = NOW()
      WHERE id = ${data.dmcaClaimId}::uuid
    `;

    // Notify claimant
    await sendEmail({
      to: claim[0].claimant_email,
      subject: 'Counter-Notice Received for Your DMCA Claim',
      html: `<p>A counter-notice has been received for your DMCA claim.</p>
             <p>Claim ID: ${data.dmcaClaimId}</p>
             <p>You have 10 business days to file legal action or the content will be restored.</p>`,
      text: `Counter-notice received for DMCA claim ${data.dmcaClaimId}. You have 10 business days to file legal action.`,
    }).catch(err => console.error('Failed to send counter-notice email:', err));

    res.status(201).json({
      message: 'Counter-notice submitted. Claimant has 10 business days to file legal action.',
    });
  })
);

/**
 * Get DMCA claims (admin/moderator only)
 * GET /api/dmca/claims
 */
router.get(
  '/claims',
  authenticate,
  requireModerator,
  asyncHandler(async (req, res) => {
    const { status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    if (status) {
      whereClause = `WHERE status = '${status}'`;
    }

    const claims = await prisma.$queryRaw`
      SELECT dc.*, c.title as content_title
      FROM dmca_claims dc
      LEFT JOIN content c ON dc.contentId = c.id
      ${whereClause ? `WHERE dc.status = ${status}` : ''}
      ORDER BY dc.createdAt DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const total = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM dmca_claims
      ${whereClause ? `WHERE status = ${status}` : ''}
    ` as any[];

    res.json({
      claims,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(total[0]?.count || '0'),
        pages: Math.ceil(parseInt(total[0]?.count || '0') / limitNum),
      },
    });
  })
);

/**
 * Process DMCA claim (admin only)
 * POST /api/dmca/claims/:claimId/process
 */
router.post(
  '/claims/:claimId/process',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { claimId } = req.params;
    const { action, notes } = req.body; // action: 'approve' | 'reject' | 'restore'

    if (!['approve', 'reject', 'restore'].includes(action)) {
      throw new ValidationError('Invalid action');
    }

    const claim = await prisma.$queryRaw`
      SELECT * FROM dmca_claims WHERE id = ${claimId}::uuid
    ` as any[];

    if (!claim || claim.length === 0) {
      throw new NotFoundError('DMCA claim not found');
    }

    const contentId = claim[0].contentId;

    switch (action) {
      case 'approve':
        // Permanently delete content
        await prisma.content.update({
          where: { id: contentId },
          data: {
            status: 'DELETED',
            deletedAt: new Date(),
          },
        });

        await prisma.$executeRaw`
          UPDATE dmca_claims 
          SET status = 'approved', 
              admin_notes = ${notes || null},
              resolvedAt = NOW(),
              updatedAt = NOW()
          WHERE id = ${claimId}::uuid
        `;
        break;

      case 'reject':
        // Restore content
        await prisma.content.update({
          where: { id: contentId },
          data: {
            status: 'PUBLISHED',
          },
        });

        await prisma.$executeRaw`
          UPDATE dmca_claims 
          SET status = 'rejected',
              admin_notes = ${notes || null},
              resolvedAt = NOW(),
              updatedAt = NOW()
          WHERE id = ${claimId}::uuid
        `;
        break;

      case 'restore':
        // Restore after counter-notice period (10-14 business days)
        await prisma.content.update({
          where: { id: contentId },
          data: {
            status: 'PUBLISHED',
          },
        });

        await prisma.$executeRaw`
          UPDATE dmca_claims 
          SET status = 'restored',
              admin_notes = ${notes || null},
              resolvedAt = NOW(),
              updatedAt = NOW()
          WHERE id = ${claimId}::uuid
        `;
        break;
    }

    await cache.invalidate([`content:${contentId}`]);

    res.json({ message: `DMCA claim ${action}d successfully` });
  })
);

/**
 * Get user's claims (for content creators)
 * GET /api/dmca/my-claims
 */
router.get(
  '/my-claims',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    const claims = await prisma.$queryRaw`
      SELECT dc.*, c.title as content_title
      FROM dmca_claims dc
      JOIN content c ON dc.contentId = c.id
      JOIN creators cr ON c.creatorId = cr.id
      WHERE cr.userId = ${userId}
      ORDER BY dc.createdAt DESC
    `;

    res.json({ claims });
  })
);

export default router;
