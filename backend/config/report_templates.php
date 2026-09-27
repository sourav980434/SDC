<?php

return [
    // Folder holding the legacy Word report templates (T<test>_D<variant>_<stamp>.dot).
    // Relative paths are resolved from the backend folder.
    'path' => env('REPORT_TEMPLATE_PATH', 'storage/app/REPORT_MASTER'),

    // Converted HTML cache. Empty = REPORT_MASTER/_html, so the converted templates travel with
    // the folder and a server without Word / LibreOffice can still open them.
    'cache_path' => env('REPORT_TEMPLATE_CACHE_PATH'),

    // Generated patient report PDFs (kept against the patient and the bill).
    'pdf_path' => env('REPORT_PDF_PATH'),

    // LibreOffice binary, used to convert templates where MS Word is not available (Linux / cloud).
    // Empty = look in the usual places and on PATH.
    'libreoffice' => env('REPORT_LIBREOFFICE_PATH'),
];
