// Para scripts fuera de Next: unstable_cache sin caché y las invalidaciones como no-op.
module.exports = {
  unstable_cache: (fn) => fn,
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
};
