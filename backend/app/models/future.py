"""Future-only ORM models intentionally excluded from the active MVP runtime.

These tables may still exist in older databases because the baseline migration
created a broader schema than the current product surface. Keeping them out of
`app.models` prevents inactive entities from being treated as part of the live
runtime contract while preserving the option to reintroduce them deliberately
in a later iteration.
"""
