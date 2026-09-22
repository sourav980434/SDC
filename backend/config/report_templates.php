<?php

return [
    // Folder holding the legacy Word report templates (T<test>_D<variant>_<stamp>.dot).
    // Relative paths are resolved from the backend folder.
    'path' => env('REPORT_TEMPLATE_PATH', 'storage/app/REPORT_MASTER'),

    // Converted HTML is cached here, keyed by file name + modified time.
    'cache_path' => storage_path('app/private/report_template_cache'),
];
