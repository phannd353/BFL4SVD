import z from "zod";

export const postDeleteSchema = z.object({
  id: z.string(),
  userId: z.string(),
});

export const postSlugSchema = z.object({
  slug: z.string(),
});

export const postCreateSchema = z.object({
  title: z.string(),
  userId: z.string(),
});

export const postParamSchema = z.object({
  postId: z.string(),
  userId: z.string(),
});

export const postEditFormContentSchema = z.object({
  content: z.any().optional(),
});

export const postEditFormSchema = z.object({
  title: z
    .string()
    .min(2, {
      message: "Title must be at least 2 characters.",
    })
    .max(120, {
      message: "Title must not be longer than 120 characters.",
    }),
  slug: z
    .string()
    .min(2, {
      message: "Slug must be at least 2 characters.",
    })
    .max(100, {
      message: "Slug must not be longer than 100 characters.",
    }),
  categoryId: z.string().optional(),
  thumbnail: z.string().optional(),
  summary: z
    .string()
    .min(2, {
      message: "Summary must be at least 2 characters.",
    })
    .max(500, {
      message: "Summary must not be longer than 500 characters.",
    }),
  content: z.any().optional(),
  published: z.boolean().optional(),
});

export const postUpdateSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  categoryId: z.string().optional(),
  thumbnail: z.string().optional(),
  summary: z.string().optional(),
  content: z.any().optional(),
  published: z.boolean().optional(),
});
