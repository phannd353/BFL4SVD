"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryResponseDto, CategoryCreateDto } from "@/types/collection";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/services/category.service";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import slugify from "react-slugify";

interface CategoryManagerProps {
  initialCategories: CategoryResponseDto[];
}

export default function CategoryManager({
  initialCategories,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function resetForm() {
    setName("");
    setSlug("");
    setEditingId(null);
  }

  async function saveCategory() {
    const payload: CategoryCreateDto = {
      name: name.trim(),
      slug: slug.trim() || slugify(name.trim()),
    };
    if (!payload.name) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, payload);
        setCategories((current) =>
          current.map((category) =>
            category.id === editingId ? { ...category, ...payload } : category,
          ),
        );
        toast.success("Category updated");
      } else {
        const response = await createCategory(payload);
        setCategories((current) => [
          ...current,
          {
            ...payload,
            id: response.data.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        toast.success("Category created");
      }
      resetForm();
    } catch {
      toast.error(
        "Unable to save category. The name or slug may already exist.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeCategory(id: string) {
    if (
      !window.confirm(
        "Delete this category? Posts using it will be uncategorized.",
      )
    ) {
      return;
    }

    try {
      await deleteCategory(id);
      setCategories((current) =>
        current.filter((category) => category.id !== id),
      );
      if (editingId === id) resetForm();
      toast.success("Category deleted");
    } catch {
      toast.error("Unable to delete category");
    }
  }

  function editCategory(category: CategoryResponseDto) {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              {editingId ? "Edit category" : "New category"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Keep category names and slugs short and consistent.
            </p>
          </div>
          {editingId && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetForm}
            >
              <X />
              <span className="sr-only">Cancel editing</span>
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Category name"
            aria-label="Category name"
          />
          <Input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="category-slug"
            aria-label="Category slug"
          />
          <Button type="button" onClick={saveCategory} disabled={isSaving}>
            {editingId ? <Pencil /> : <Plus />}
            {editingId ? "Update" : "Add"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 border-b bg-muted/40 px-4 py-3 text-sm font-medium">
          <span>Name</span>
          <span>Slug</span>
          <span className="sr-only">Actions</span>
        </div>
        {categories.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No categories yet.
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 border-b px-4 py-3 last:border-b-0"
            >
              <span className="truncate text-sm font-medium">
                {category.name}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {category.slug}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => editCategory(category)}
                  aria-label={`Edit ${category.name}`}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeCategory(category.id)}
                  aria-label={`Delete ${category.name}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
