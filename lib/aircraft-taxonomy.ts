// VA-153/VA-165: correlaciones categoría ↔ marca ↔ modelo ↔ submodelo. La categoría RECOMENDADA es del modelo
// (recommendedCategoryId) y un submodelo puede pisarla (categoryOverride); la de una marca se deriva de sus
// modelos. La usa el formulario de publicar para acotar marcas y modelos (los filtros de /aircraft y el
// buscador de la Home usan los avisos reales). Sin dependencias de servidor.

export type TaxonomyVariant = { id: string; name: string; categoryOverride?: string | null };
export type TaxonomyModel = { id: string; name: string; recommendedCategoryId?: string | null; variants?: TaxonomyVariant[] };
export type TaxonomyBrand = { id: string; name: string; models: TaxonomyModel[] };

/** Categoría que corresponde a un modelo o, si se eligió, a su submodelo. null: el modelo no tiene. */
export function effectiveCategory(model: TaxonomyModel | undefined, variant?: TaxonomyVariant): string | null {
  return variant?.categoryOverride || model?.recommendedCategoryId || null;
}

/** ¿El modelo (o alguno de sus submodelos) es de alguna de estas categorías? Sin categorías: todos. */
export function modelInCategories(model: TaxonomyModel, categoryIds: readonly string[]): boolean {
  if (categoryIds.length === 0) return true;
  if (model.recommendedCategoryId && categoryIds.includes(model.recommendedCategoryId)) return true;
  return (model.variants ?? []).some((v) => v.categoryOverride && categoryIds.includes(v.categoryOverride));
}

export function modelsInCategories<M extends TaxonomyModel>(models: M[], categoryIds: readonly string[]): M[] {
  return models.filter((m) => modelInCategories(m, categoryIds));
}

/** Marcas con al menos un modelo de esas categorías. */
export function brandsInCategories<B extends TaxonomyBrand>(brands: B[], categoryIds: readonly string[]): B[] {
  if (categoryIds.length === 0) return brands;
  return brands.filter((b) => b.models.some((m) => modelInCategories(m, categoryIds)));
}

/** Submodelos cuya categoría efectiva es una de esas. */
export function variantsInCategories(model: TaxonomyModel, categoryIds: readonly string[]): TaxonomyVariant[] {
  if (categoryIds.length === 0) return model.variants ?? [];
  return (model.variants ?? []).filter((v) => {
    const c = effectiveCategory(model, v);
    return !c || categoryIds.includes(c);
  });
}
