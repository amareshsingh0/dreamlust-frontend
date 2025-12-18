import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/authorize';
import { validateQuery } from '../middleware/validation';
import { z } from 'zod';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

const router = Router();

/**
 * GET /api/admin/export/users/csv
 * Export users to CSV
 */
router.get(
  '/users/csv',
  authenticate,
  requireAdmin,
  validateQuery(z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE']).optional(),
    role: z.enum(['USER', 'CREATOR', 'MODERATOR', 'ADMIN']).optional(),
  })),
  async (req: Request, res: Response) => {
    const { status, role } = req.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        role: true,
        status: true,
        created_at: true,
        _count: {
          select: {
            content: true,
            reports: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const csvData = users.map((user) => ({
      ID: user.id,
      Email: user.email,
      Username: user.username || '',
      'Display Name': user.display_name || '',
      Role: user.role,
      Status: user.status,
      'Content Count': user._count.content,
      'Reports Count': user._count.reports,
      'Created At': user.created_at.toISOString(),
    }));

    const parser = new Parser();
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.csv`);
    res.send(csv);
  }
);

/**
 * GET /api/admin/export/users/excel
 * Export users to Excel
 */
router.get(
  '/users/excel',
  authenticate,
  requireAdmin,
  validateQuery(z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE']).optional(),
    role: z.enum(['USER', 'CREATOR', 'MODERATOR', 'ADMIN']).optional(),
  })),
  async (req: Request, res: Response) => {
    const { status, role } = req.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        role: true,
        status: true,
        created_at: true,
        _count: {
          select: {
            content: true,
            reports: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Display Name', key: 'displayName', width: 20 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Content Count', key: 'contentCount', width: 15 },
      { header: 'Reports Count', key: 'reportsCount', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 25 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data
    users.forEach((user) => {
      worksheet.addRow({
        id: user.id,
        email: user.email,
        username: user.username || '',
        displayName: user.display_name || '',
        role: user.role,
        status: user.status,
        contentCount: user._count.content,
        reportsCount: user._count.reports,
        createdAt: user.created_at.toISOString(),
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=users_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }
);

/**
 * GET /api/admin/export/content/csv
 * Export content to CSV
 */
router.get(
  '/content/csv',
  authenticate,
  requireAdmin,
  validateQuery(z.object({
    status: z.string().optional(),
    type: z.string().optional(),
  })),
  async (req: Request, res: Response) => {
    const { status, type } = req.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const content = await prisma.content.findMany({
      where,
      include: {
        creator: {
          include: {
            user: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            views: true,
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const csvData = content.map((item) => ({
      ID: item.id,
      Title: item.title,
      Type: item.type,
      Status: item.status,
      Creator: item.creator.user.username || item.creator.user.email,
      'View Count': item._count.views,
      'Like Count': item._count.likes,
      'Comment Count': item._count.comments,
      'Created At': item.created_at?.toISOString() || '',
    }));

    const parser = new Parser();
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=content_${Date.now()}.csv`);
    res.send(csv);
  }
);

/**
 * GET /api/admin/export/content/excel
 * Export content to Excel
 */
router.get(
  '/content/excel',
  authenticate,
  requireAdmin,
  validateQuery(z.object({
    status: z.string().optional(),
    type: z.string().optional(),
  })),
  async (req: Request, res: Response) => {
    const { status, type } = req.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const content = await prisma.content.findMany({
      where,
      include: {
        creator: {
          include: {
            user: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            views: true,
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Content');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Creator', key: 'creator', width: 25 },
      { header: 'View Count', key: 'viewCount', width: 15 },
      { header: 'Like Count', key: 'likeCount', width: 15 },
      { header: 'Comment Count', key: 'commentCount', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    content.forEach((item) => {
      worksheet.addRow({
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        creator: item.creator.user.username || item.creator.user.email,
        viewCount: item._count.views,
        likeCount: item._count.likes,
        commentCount: item._count.comments,
        createdAt: item.created_at?.toISOString() || '',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=content_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }
);

export default router;

