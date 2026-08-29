<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/api', function () {
    $dbStatus = 'DISCONNECTED';
    try {
        if (DB::connection()->getPdo()) {
            $dbStatus = 'CONNECTED';
        }
    } catch (\Exception $e) {
        $dbStatus = 'ERROR: ' . $e->getMessage();
    }

    return response()->json([
        'status' => 'ONLINE',
        'app' => 'Santoshpur Diagnostic Centre LIMS API',
        'database' => $dbStatus,
        'timestamp' => now()->toDateTimeString()
    ]);
});

// Real-time Dashboard KPI Metrics & Ready Reports Endpoint (NEW WEB TABLES MAPPING)
Route::get('/api/dashboard/stats', function () {
    try {
        $today = now()->format('Y-m-d');

        // Today's total web bookings count (from new tbl_web_booking_hdr table)
        $todayBookings = DB::table('tbl_web_booking_hdr')
            ->whereDate('created_at', $today)
            ->count();

        // Today's total cash revenue collected in this application (from new tbl_web_payments table)
        $todayRevenue = DB::table('tbl_web_payments')
            ->whereDate('created_at', $today)
            ->sum('amount') ?? 0;

        // Total pending due count across active web bookings
        $pendingDuesCount = DB::table('tbl_web_booking_hdr')
            ->where('due_amount', '>', 0)
            ->count();

        // Total pending due amount
        $pendingDuesAmount = DB::table('tbl_web_booking_hdr')
            ->where('due_amount', '>', 0)
            ->sum('due_amount') ?? 0;

        // Today's new patient growth count
        $todayNewPatients = DB::table('MPatient')
            ->whereDate('AddDate', $today)
            ->count();

        // Recent 5 ready for patient dispatch bookings created in this new web application
        $readyDispatches = DB::table('tbl_web_booking_hdr as h')
            ->orderBy('h.created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($h) {
                $tests = DB::table('tbl_web_booking_dtl as d')
                    ->where('d.booking_id', $h->id)
                    ->pluck('d.test_name')
                    ->filter()
                    ->implode(', ');

                return [
                    'regId' => $h->booking_no,
                    'name' => trim(($h->patient_prefix ?? '') . ' ' . ($h->patient_name ?? '')),
                    'tests' => $tests ?: 'Diagnostic Investigation',
                    'status' => 'Ready for Hardcopy',
                    'addDate' => $h->created_at
                ];
            });

        return response()->json([
            'today_bookings' => $todayBookings,
            'today_revenue' => floatval($todayRevenue),
            'pending_dues_count' => $pendingDuesCount,
            'pending_dues_amount' => floatval($pendingDuesAmount),
            'today_new_patients' => $todayNewPatients,
            'ready_dispatches' => $readyDispatches,
            'timestamp' => now()->toDateTimeString()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to calculate dashboard stats: ' . $e->getMessage()
        ], 500);
    }
});

// Helper functions for auto-generating codes
function getNextDoctorCode() {
    $maxCode = DB::table('MDoctor')->max('Code');
    if (!$maxCode) {
        return 'D0000001';
    }
    $num = intval(substr($maxCode, 1)) + 1;
    return 'D' . str_pad($num, 7, '0', STR_PAD_LEFT);
}

// Helper function to auto-generate test code
function getNextTestCode() {
    $maxCode = DB::table('MTest')->max('Code');
    if (!$maxCode) {
        return 'T0000001';
    }
    $num = intval(substr($maxCode, 1)) + 1;
    return 'T' . str_pad($num, 7, '0', STR_PAD_LEFT);
}

// Helper function to auto-generate category code
function getNextCategoryCode() {
    $maxCode = DB::table('MCategory')->max('Code');
    if (!$maxCode) {
        return 'CG000001';
    }
    $numericPart = preg_replace('/[^0-9]/', '', $maxCode);
    $num = intval($numericPart) + 1;
    return 'CG' . str_pad($num, 6, '0', STR_PAD_LEFT);
}

// Helper function to auto-generate department code
function getNextDepartmentCode() {
    $maxCode = DB::table('MDepartment')->max('Code');
    if (!$maxCode) {
        return 'DP000001';
    }
    $num = intval(substr($maxCode, 2)) + 1;
    return 'DP' . str_pad($num, 6, '0', STR_PAD_LEFT);
}

// Helper function to auto-generate subdepartment code
function getNextSubDepartmentCode() {
    $maxCode = DB::table('MSubDepartment')->max('Code');
    if (!$maxCode) {
        return 'SD000001';
    }
    $num = intval(substr($maxCode, 2)) + 1;
    return 'SD' . str_pad($num, 6, '0', STR_PAD_LEFT);
}

// Helper function to auto-generate agent/executive code
function getNextAgentCode() {
    $maxCode = DB::table('MAgent')->max('Code');
    if (!$maxCode) {
        return 'A0000001';
    }
    $num = intval(substr($maxCode, 1)) + 1;
    return 'A' . str_pad($num, 7, '0', STR_PAD_LEFT);
}

// Helper function to auto-generate collector code
function getNextCollectorCode() {
    $maxCode = DB::table('MCollector')->max('Code');
    if (!$maxCode) {
        return 'CL000001';
    }
    $num = intval(substr($maxCode, 2)) + 1;
    return 'CL' . str_pad($num, 6, '0', STR_PAD_LEFT);
}


// Helper function to calculate current Indian Financial Year (Apr-Mar)
function getCurrentFinYear() {
    $today = new DateTime();
    $m = intval($today->format('n'));
    $y = intval($today->format('Y'));
    $startYear = $m < 4 ? $y - 1 : $y;
    $endYear = $startYear + 1;
    return substr($startYear, -2) . '-' . substr($endYear, -2);
}

// Helper function to get current user code from request headers (set by frontend)
function getCurrentUserCode(\Illuminate\Http\Request $request = null) {
    if ($request) {
        return $request->header('X-User-Code', 'U0000001');
    }
    return 'U0000001';
}

// Helper function to get current user name from request headers (set by frontend)
function getCurrentUserName(\Illuminate\Http\Request $request = null) {
    if ($request) {
        return $request->header('X-User-Name', 'System');
    }
    return 'System';
}

// Preflight OPTIONS handled by CorsMiddleware (app/Http/Middleware/CorsMiddleware.php)

// Search Doctors (for Booking dropdown)
Route::get('/api/doctors', function (Request $request) {
    $search = $request->query('search', '');
    
    $query = DB::table('MDoctor')
        ->select('Code', 'Prefix', 'DoctName', 'RAddress1', 'RAddress2')
        ->where('Status', 1);
        
    if ($search !== '') {
        $query->where(function ($q) use ($search) {
            $q->where('DoctName', 'like', '%' . $search . '%')
              ->orWhere('Code', 'like', '%' . $search . '%');
        });
    }
    
    $doctors = $query->take(50)->get()->map(function ($doc) {
        $prefix = trim($doc->Prefix ?? '');
        $name = trim($doc->DoctName ?? '');
        $fullName = $prefix !== '' ? "$prefix $name" : $name;
        
        $addr1 = trim($doc->RAddress1 ?? '');
        $addr2 = trim($doc->RAddress2 ?? '');
        $address = $addr1;
        if ($addr2 !== '') {
            $address .= ($address !== '' ? '/' : '') . $addr2;
        }
        
        return [
            'code' => $doc->Code,
            'name' => $fullName,
            'address' => $address,
        ];
    });
    
    return response()->json($doctors);
});

// Search Tests (for Booking dropdown)
Route::get('/api/tests', function (Request $request) {
    $search = $request->query('search', '');
    
    $query = DB::table('MTest as t')
        ->leftJoin('MDepartment as d', 't.DeptCode', '=', 'd.Code')
        ->leftJoin('MSubDepartment as sd', 't.SubDeptCode', '=', 'sd.Code')
        ->leftJoin('MTestCategoryRate as r', function ($join) {
            $join->on('t.Code', '=', 'r.TestCode')
                 ->where('r.CatCode', '=', 'CG1');
        })
        ->select('t.Code as code', 't.Descr as name', 'd.Descr as dept_name', 'sd.Descr as sub_dept', 'r.Rate as price', 't.Duration as duration');
        
    if ($search !== '') {
        $query->where(function ($q) use ($search) {
            $q->where('t.Descr', 'like', '%' . $search . '%')
              ->orWhere('t.Code', 'like', '%' . $search . '%');
        });
    }
    
    $tests = $query->take(50)->get()->map(function ($test) {
        return [
            'code' => trim($test->code ?? ''),
            'name' => trim($test->name ?? ''),
            'dept_name' => trim($test->dept_name ?? 'GENERAL'),
            'sub_dept' => trim($test->sub_dept ?? ''),
            'price' => floatval($test->price ?? 0),
            'duration' => intval($test->duration ?? 0),
        ];
    });
    
    return response()->json($tests);
});

// ==========================================
// MASTER MANAGEMENT APIs
// ==========================================

// 1. Doctors CRUD with Pagination
Route::get('/api/master/doctors', function (Request $request) {
    $search = $request->query('search', '');
    $perPage = intval($request->query('per_page', 25));
    
    $query = DB::table('MDoctor');
    if ($search !== '') {
        $query->where(function($q) use ($search) {
            $q->where('DoctName', 'like', '%' . $search . '%')
              ->orWhere('Code', 'like', '%' . $search . '%');
        });
    }
    
    $paginator = $query->orderBy('Code', 'asc')->paginate($perPage);
    
    return response()->json($paginator);
});

Route::post('/api/master/doctors', function (Request $request) {
    $data = $request->validate([
        'Prefix' => 'nullable|string',
        'DoctName' => 'required|string',
        'RegNo' => 'nullable|string',
        'DesigCode' => 'nullable|string',
        'DeptCode' => 'nullable|string',
        'DeptCode2' => 'nullable|string',
        'RAddress1' => 'nullable|string',
        'RAddress2' => 'nullable|string',
        'RContactNo' => 'nullable|string',
        'C1Address' => 'nullable|string',
        'C1ContactNo' => 'nullable|string',
        'C2Address' => 'nullable|string',
        'C2ContactNo' => 'nullable|string',
        'Status' => 'nullable|integer',
    ]);
    
    $code = getNextDoctorCode();
    $data['Code'] = $code;
    $data['Status'] = $data['Status'] ?? 1;
    $data['AddUserCode'] = getCurrentUserCode($request);
    $data['AddDate'] = now();
    
    DB::table('MDoctor')->insert($data);
    
    return response()->json(['message' => 'Doctor created successfully', 'code' => $code]);
});

Route::put('/api/master/doctors/{code}', function (Request $request, $code) {
    $data = $request->validate([
        'Prefix' => 'nullable|string',
        'DoctName' => 'required|string',
        'RegNo' => 'nullable|string',
        'DesigCode' => 'nullable|string',
        'DeptCode' => 'nullable|string',
        'DeptCode2' => 'nullable|string',
        'RAddress1' => 'nullable|string',
        'RAddress2' => 'nullable|string',
        'RContactNo' => 'nullable|string',
        'C1Address' => 'nullable|string',
        'C1ContactNo' => 'nullable|string',
        'C2Address' => 'nullable|string',
        'C2ContactNo' => 'nullable|string',
        'Status' => 'nullable|integer',
    ]);
    
    $data['ModUserCode'] = getCurrentUserCode($request);
    $data['ModDate'] = now();
    
    DB::table('MDoctor')->where('Code', $code)->update($data);
    
    return response()->json(['message' => 'Doctor updated successfully']);
});

Route::delete('/api/master/doctors/{code}', function ($code) {
    DB::table('MDoctor')->where('Code', $code)->delete();
    return response()->json(['message' => 'Doctor deleted successfully']);
});

// 2. Tests CRUD with Pagination and Dropdown filters
Route::get('/api/master/tests', function (Request $request) {
    $search = $request->query('search', '');
    $perPage = intval($request->query('per_page', 25));
    $deptCode = $request->query('dept_code', '');
    $subDeptCode = $request->query('sub_dept_code', '');
    
    $query = DB::table('MTest as t')
        ->leftJoin('MDepartment as d', 't.DeptCode', '=', 'd.Code')
        ->leftJoin('MSubDepartment as sd', 't.SubDeptCode', '=', 'sd.Code')
        ->leftJoin('MTestCategoryRate as r', function ($join) {
            $join->on('t.Code', '=', 'r.TestCode')
                 ->where('r.CatCode', '=', 'CG1');
        })
        ->select('t.*', DB::raw("RTRIM(d.Descr) as DeptName"), DB::raw("RTRIM(sd.Descr) as SubDeptName"), 'r.Rate as GeneralRate');
        
    if ($search !== '') {
        $query->where(function($q) use ($search) {
            $q->where('t.Descr', 'like', '%' . $search . '%')
              ->orWhere('t.Code', 'like', '%' . $search . '%');
        });
    }
    
    if ($deptCode !== '' && $deptCode !== 'All') {
        $query->where('t.DeptCode', $deptCode);
    }
    if ($subDeptCode !== '' && $subDeptCode !== 'All') {
        $query->where('t.SubDeptCode', $subDeptCode);
    }
    
    $paginator = $query->orderBy('t.Code', 'asc')->paginate($perPage);
    return response()->json($paginator);
});

Route::post('/api/master/tests', function (Request $request) {
    $data = $request->validate([
        'Descr' => 'required|string',
        'DeptCode' => 'nullable|string',
        'SubDeptCode' => 'nullable|string',
        'Duration' => 'nullable|integer',
        'Remarks' => 'nullable|string',
        'MedecineCharge' => 'nullable|numeric',
        'DrProcedureCharge' => 'nullable|numeric',
        'Profile' => 'nullable|string',
        'SENDTO' => 'nullable|integer',
        'DrComm' => 'nullable|numeric',
        'GeneralRate' => 'required|numeric',
    ]);
    
    $generalRate = $data['GeneralRate'];
    unset($data['GeneralRate']);
    
    $code = getNextTestCode();
    $data['Code'] = $code;
    $data['AddUserCode'] = getCurrentUserCode($request);
    $data['AddDate'] = now();
    
    DB::transaction(function () use ($data, $code, $generalRate) {
        DB::table('MTest')->insert($data);
        
        // Insert general rate
        DB::table('MTestCategoryRate')->insert([
            'CatCode' => 'CG1',
            'DeptCode' => $data['DeptCode'] ?? '',
            'SubDeptCode' => $data['SubDeptCode'] ?? '',
            'TestCode' => $code,
            'Rate' => $generalRate,
            'Discount' => 0.0,
        ]);
    });
    
    return response()->json(['message' => 'Test created successfully', 'code' => $code]);
});

Route::put('/api/master/tests/{code}', function (Request $request, $code) {
    $data = $request->validate([
        'Descr' => 'required|string',
        'DeptCode' => 'nullable|string',
        'SubDeptCode' => 'nullable|string',
        'Duration' => 'nullable|integer',
        'Remarks' => 'nullable|string',
        'MedecineCharge' => 'nullable|numeric',
        'DrProcedureCharge' => 'nullable|numeric',
        'Profile' => 'nullable|string',
        'SENDTO' => 'nullable|integer',
        'DrComm' => 'nullable|numeric',
        'GeneralRate' => 'required|numeric',
    ]);
    
    $generalRate = $data['GeneralRate'];
    unset($data['GeneralRate']);
    
    $data['ModUserCode'] = getCurrentUserCode($request);
    $data['ModDate'] = now();
    
    DB::transaction(function () use ($data, $code, $generalRate) {
        DB::table('MTest')->where('Code', $code)->update($data);
        
        // Update or insert general rate
        $exists = DB::table('MTestCategoryRate')
            ->where('TestCode', $code)
            ->where('CatCode', 'CG1')
            ->exists();
            
        if ($exists) {
            DB::table('MTestCategoryRate')
                ->where('TestCode', $code)
                ->where('CatCode', 'CG1')
                ->update([
                    'DeptCode' => $data['DeptCode'] ?? '',
                    'SubDeptCode' => $data['SubDeptCode'] ?? '',
                    'Rate' => $generalRate,
                ]);
        } else {
            DB::table('MTestCategoryRate')->insert([
                'CatCode' => 'CG1',
                'DeptCode' => $data['DeptCode'] ?? '',
                'SubDeptCode' => $data['SubDeptCode'] ?? '',
                'TestCode' => $code,
                'Rate' => $generalRate,
                'Discount' => 0.0,
            ]);
        }
    });
    
    return response()->json(['message' => 'Test updated successfully']);
});

Route::delete('/api/master/tests/{code}', function ($code) {
    DB::transaction(function () use ($code) {
        DB::table('MTestCategoryRate')->where('TestCode', $code)->delete();
        DB::table('MTest')->where('Code', $code)->delete();
    });
    return response()->json(['message' => 'Test deleted successfully']);
});

// 3. Category CRUD
Route::get('/api/master/categories', function () {
    return response()->json(DB::table('MCategory')->orderBy('Code', 'desc')->get());
});

Route::post('/api/master/categories', function (Request $request) {
    $data = $request->validate([
        'Descr' => 'required|string',
    ]);
    $code = getNextCategoryCode();
    $data['Code'] = $code;
    DB::table('MCategory')->insert($data);
    return response()->json(['message' => 'Category created successfully', 'code' => $code]);
});

Route::put('/api/master/categories/{code}', function (Request $request, $code) {
    $data = $request->validate([
        'Descr' => 'required|string',
    ]);
    DB::table('MCategory')->where('Code', $code)->update($data);
    return response()->json(['message' => 'Category updated successfully']);
});

Route::delete('/api/master/categories/{code}', function ($code) {
    DB::table('MCategory')->where('Code', $code)->delete();
    return response()->json(['message' => 'Category deleted successfully']);
});

// 4. Department Details CRUD with Pagination
Route::get('/api/master/departments/list', function (Request $request) {
    $search = $request->query('search', '');
    $perPage = intval($request->query('per_page', 25));
    
    $query = DB::table('MDepartment');
    if ($search !== '') {
        $query->where(function($q) use ($search) {
            $q->where('Descr', 'like', '%' . $search . '%')
              ->orWhere('Code', 'like', '%' . $search . '%');
        });
    }
    
    $paginator = $query->orderBy('Code', 'asc')->paginate($perPage);
    
    return response()->json($paginator);
});

Route::post('/api/master/departments', function (Request $request) {
    $data = $request->validate([
        'Descr' => 'required|string',
        'Remarks' => 'nullable|string',
    ]);
    
    $code = getNextDepartmentCode();
    $data['Code'] = $code;
    $data['AddUserCode'] = getCurrentUserCode($request);
    $data['AddDate'] = now();
    
    DB::table('MDepartment')->insert($data);
    
    return response()->json(['message' => 'Department created successfully', 'code' => $code]);
});

Route::put('/api/master/departments/{code}', function (Request $request, $code) {
    $data = $request->validate([
        'Descr' => 'required|string',
        'Remarks' => 'nullable|string',
    ]);
    
    $data['ModUserCode'] = getCurrentUserCode($request);
    $data['ModDate'] = now();
    
    DB::table('MDepartment')->where('Code', $code)->update($data);
    
    return response()->json(['message' => 'Department updated successfully']);
});

Route::delete('/api/master/departments/{code}', function ($code) {
    DB::table('MDepartment')->where('Code', $code)->delete();
    return response()->json(['message' => 'Department deleted successfully']);
});

// 5. Sub Department CRUD with Pagination
Route::get('/api/master/subdepartments/list', function (Request $request) {
    $search = $request->query('search', '');
    $perPage = intval($request->query('per_page', 25));
    
    $query = DB::table('MSubDepartment as sd')
        ->leftJoin('MDepartment as d', 'sd.DeptCode', '=', 'd.Code')
        ->select('sd.*', 'd.Descr as DeptName');
        
    if ($search !== '') {
        $query->where(function($q) use ($search) {
            $q->where('sd.Descr', 'like', '%' . $search . '%')
              ->orWhere('sd.Code', 'like', '%' . $search . '%')
              ->orWhere('d.Descr', 'like', '%' . $search . '%');
        });
    }
    
    $paginator = $query->orderBy('sd.Code', 'asc')->paginate($perPage);
    
    return response()->json($paginator);
});

Route::post('/api/master/subdepartments', function (Request $request) {
    $data = $request->validate([
        'DeptCode' => 'required|string',
        'Descr' => 'required|string',
        'Remarks' => 'nullable|string',
    ]);
    
    $code = getNextSubDepartmentCode();
    $data['Code'] = $code;
    $data['AddUserCode'] = getCurrentUserCode($request);
    $data['AddDate'] = now();
    
    DB::table('MSubDepartment')->insert($data);
    
    return response()->json(['message' => 'Sub department created successfully', 'code' => $code]);
});

Route::put('/api/master/subdepartments/{code}', function (Request $request, $code) {
    $data = $request->validate([
        'DeptCode' => 'required|string',
        'Descr' => 'required|string',
        'Remarks' => 'nullable|string',
    ]);
    
    $data['ModUserCode'] = getCurrentUserCode($request);
    $data['ModDate'] = now();
    
    DB::table('MSubDepartment')->where('Code', $code)->update($data);
    
    return response()->json(['message' => 'Sub department updated successfully']);
});

Route::delete('/api/master/subdepartments/{code}', function ($code) {
    DB::table('MSubDepartment')->where('Code', $code)->delete();
    return response()->json(['message' => 'Sub department deleted successfully']);
});

// 6. Marketing Executive (MAgent) CRUD with Pagination
Route::get('/api/master/agents', function (Request $request) {
    $search = $request->query('search', '');
    $perPage = intval($request->query('per_page', 25));
    
    $query = DB::table('MAgent');
    if ($search !== '') {
        $query->where(function($q) use ($search) {
            $q->where('Descr', 'like', '%' . $search . '%')
              ->orWhere('Code', 'like', '%' . $search . '%');
        });
    }
    
    $paginator = $query->orderBy('Code', 'asc')->paginate($perPage);
    
    return response()->json($paginator);
});

Route::post('/api/master/agents', function (Request $request) {
    $data = $request->validate([
        'Descr' => 'required|string',
        'Address' => 'nullable|string',
        'PinCode' => 'nullable|string',
        'District' => 'nullable|string',
        'PhoneNo' => 'nullable|string',
        'MobileNo' => 'nullable|string',
        'Status' => 'nullable|integer',
        'Remarks' => 'nullable|string',
    ]);
    
    $code = getNextAgentCode();
    $data['Code'] = $code;
    $data['Status'] = $data['Status'] ?? 1;
    $data['AddUserCode'] = getCurrentUserCode($request);
    $data['AddDate'] = now();
    
    DB::table('MAgent')->insert($data);
    
    return response()->json(['message' => 'Marketing Executive created successfully', 'code' => $code]);
});

Route::put('/api/master/agents/{code}', function (Request $request, $code) {
    $data = $request->validate([
        'Descr' => 'required|string',
        'Address' => 'nullable|string',
        'PinCode' => 'nullable|string',
        'District' => 'nullable|string',
        'PhoneNo' => 'nullable|string',
        'MobileNo' => 'nullable|string',
        'Status' => 'nullable|integer',
        'Remarks' => 'nullable|string',
    ]);
    
    $data['ModUserCode'] = getCurrentUserCode($request);
    $data['ModDate'] = now();
    
    DB::table('MAgent')->where('Code', $code)->update($data);
    
    return response()->json(['message' => 'Marketing Executive updated successfully']);
});

Route::delete('/api/master/agents/{code}', function ($code) {
    DB::table('MAgent')->where('Code', $code)->delete();
    return response()->json(['message' => 'Marketing Executive deleted successfully']);
});

// 7. Collector Details CRUD with Pagination
Route::get('/api/master/collectors', function (Request $request) {
    $search = $request->query('search', '');
    $perPage = intval($request->query('per_page', 25));
    
    $query = DB::table('MCollector');
    if ($search !== '') {
        $query->where(function($q) use ($search) {
            $q->where('Descr', 'like', '%' . $search . '%')
              ->orWhere('Code', 'like', '%' . $search . '%');
        });
    }
    
    $paginator = $query->orderBy('Code', 'asc')->paginate($perPage);
    
    return response()->json($paginator);
});

Route::post('/api/master/collectors', function (Request $request) {
    $data = $request->validate([
        'Descr' => 'required|string',
        'Address1' => 'nullable|string',
        'Address2' => 'nullable|string',
        'PhoneNo' => 'nullable|string',
        'MobileNo' => 'nullable|string',
        'Status' => 'nullable|integer',
        'Remarks' => 'nullable|string',
    ]);
    
    $code = getNextCollectorCode();
    $data['Code'] = $code;
    $data['Status'] = $data['Status'] ?? 1;
    $data['AddUserCode'] = getCurrentUserCode($request);
    $data['AddDate'] = now();
    
    DB::table('MCollector')->insert($data);
    
    return response()->json(['message' => 'Collector created successfully', 'code' => $code]);
});

Route::put('/api/master/collectors/{code}', function (Request $request, $code) {
    $data = $request->validate([
        'Descr' => 'required|string',
        'Address1' => 'nullable|string',
        'Address2' => 'nullable|string',
        'PhoneNo' => 'nullable|string',
        'MobileNo' => 'nullable|string',
        'Status' => 'nullable|integer',
        'Remarks' => 'nullable|string',
    ]);
    
    $data['ModUserCode'] = getCurrentUserCode($request);
    $data['ModDate'] = now();
    
    DB::table('MCollector')->where('Code', $code)->update($data);
    
    return response()->json(['message' => 'Collector updated successfully']);
});

Route::delete('/api/master/collectors/{code}', function ($code) {
    DB::table('MCollector')->where('Code', $code)->delete();
    return response()->json(['message' => 'Collector deleted successfully']);
});

// Dropdowns Helpers
Route::get('/api/master/departments', function () {
    return response()->json(DB::table('MDepartment')->select('Code', 'Descr')->get());
});

Route::get('/api/master/subdepartments', function () {
    return response()->json(DB::table('MSubDepartment')->select('Code', 'DeptCode', 'Descr')->get());
});

// ==========================================
// PATIENT MASTER & INTEGRATION APIs
// ==========================================

function checkPatientTableExists() {
    try {
        return DB::select("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MPatient'") ? true : false;
    } catch (\Exception $e) {
        return false;
    }
}

// 1. Patient Table Migration - Initialization
Route::post('/api/master/patients/migrate-init', function () {
    set_time_limit(0);
    
    try {
        DB::transaction(function () {
            // Drop table if it exists
            if (checkPatientTableExists()) {
                DB::statement("DROP TABLE MPatient");
            }
            
            // Create Table
            DB::statement("
                CREATE TABLE MPatient (
                    Code NVARCHAR(50) PRIMARY KEY,
                    Prefix NVARCHAR(50) NULL,
                    Name NVARCHAR(255) NOT NULL,
                    Sex NVARCHAR(50) NULL,
                    AgeYear INT NULL,
                    AgeMonth INT NULL,
                    AgeDay INT NULL,
                    Address1 NVARCHAR(255) NULL,
                    Address2 NVARCHAR(255) NULL,
                    MobileNo NVARCHAR(50) NULL,
                    AddDate DATETIME NULL,
                    ModDate DATETIME NULL
                )
            ");
        });
        
        // Count total unique patient records
        $stmt = DB::select("
            SELECT COUNT(*) as total FROM (
                SELECT PName, MobileNo,
                       ROW_NUMBER() OVER (PARTITION BY PName, MobileNo ORDER BY AddDate DESC) as rn
                FROM TBookingHDR
                WHERE PName IS NOT NULL AND PName != ''
                  AND NOT (
                    (AgeYear IS NOT NULL AND AgeYear <> '' AND TRY_CAST(AgeYear AS NUMERIC(18,4)) IS NULL) OR
                    (AgeMonth IS NOT NULL AND AgeMonth <> '' AND TRY_CAST(AgeMonth AS NUMERIC(18,4)) IS NULL) OR
                    (AgeDay IS NOT NULL AND AgeDay <> '' AND TRY_CAST(AgeDay AS NUMERIC(18,4)) IS NULL)
                  )
            ) as TempUnique
            WHERE rn = 1
        ");
        $total = intval($stmt[0]->total ?? 0);
        
        return response()->json(['total' => $total]);
            
    } catch (\Exception $e) {
        return response()->json(['error' => 'Initialization failed: ' . $e->getMessage()], 500);
    }
});

// 2. Patient Table Migration - Chunk
Route::post('/api/master/patients/migrate-chunk', function (Request $request) {
    $start = intval($request->input('start'));
    $end = intval($request->input('end'));
    
    if ($start <= 0 || $end <= 0 || $start > $end) {
        return response()->json(['error' => 'Invalid range parameters.'], 400);
    }
    
    set_time_limit(0);
    
    try {
        DB::statement("
            INSERT INTO MPatient (Code, Prefix, Name, Sex, AgeYear, AgeMonth, AgeDay, Address1, Address2, MobileNo, AddDate)
            SELECT 
                'P' + CAST((RowNum + 999) as VARCHAR(50)) as Code,
                PPrefix, PName, Sex, 
                TRY_CAST(TRY_CAST(AgeYear AS NUMERIC(18,4)) AS INT),
                TRY_CAST(TRY_CAST(AgeMonth AS NUMERIC(18,4)) AS INT),
                TRY_CAST(TRY_CAST(AgeDay AS NUMERIC(18,4)) AS INT),
                Address1, Address2, MobileNo, AddDate
            FROM (
                SELECT 
                    PPrefix, PName, Sex, AgeYear, AgeMonth, AgeDay, Address1, Address2, MobileNo, AddDate,
                    ROW_NUMBER() OVER (ORDER BY PName, MobileNo) as RowNum
                FROM (
                    SELECT 
                        PPrefix, PName, Sex, AgeYear, AgeMonth, AgeDay, Address1, Address2, MobileNo, AddDate,
                        ROW_NUMBER() OVER (PARTITION BY PName, MobileNo ORDER BY AddDate DESC) as rn
                    FROM TBookingHDR
                    WHERE PName IS NOT NULL AND PName != ''
                      AND NOT (
                        (AgeYear IS NOT NULL AND AgeYear <> '' AND TRY_CAST(AgeYear AS NUMERIC(18,4)) IS NULL) OR
                        (AgeMonth IS NOT NULL AND AgeMonth <> '' AND TRY_CAST(AgeMonth AS NUMERIC(18,4)) IS NULL) OR
                        (AgeDay IS NOT NULL AND AgeDay <> '' AND TRY_CAST(AgeDay AS NUMERIC(18,4)) IS NULL)
                      )
                ) as TempPartitioned
                WHERE rn = 1
            ) as TempUnique
            WHERE RowNum BETWEEN :start AND :end
        ", ['start' => $start, 'end' => $end]);
        
        return response()->json(['success' => true, 'migrated' => ($end - $start + 1)]);
            
    } catch (\Exception $e) {
        return response()->json(['error' => 'Chunk migration failed: ' . $e->getMessage()], 500);
    }
});

// Check if MPatient table exists and has records (status API for frontend toggle)
Route::get('/api/master/patients/status', function () {
    $exists = checkPatientTableExists();
    $count = 0;
    if ($exists) {
        try {
            $count = DB::table('MPatient')->count();
        } catch (\Exception $e) {
            $count = 0;
        }
    }
    return response()->json([
        'implemented' => ($exists && $count > 0),
        'count' => $count
    ]);
});

// 2. Fetch Patient by exact Code
Route::get('/api/patients/by-code/{code}', function ($code) {
    if (!checkPatientTableExists()) {
        return response()->json(null);
    }
    
    $formattedCode = (strpos(strtoupper($code), 'P') === 0) ? $code : 'P' . $code;
    $patient = DB::table('MPatient')->where('Code', $formattedCode)->first();
    if ($patient) {
        return response()->json([
            'code' => trim($patient->Code ?? ''),
            'prefix' => trim($patient->Prefix ?? ''),
            'name' => trim($patient->Name ?? ''),
            'sex' => trim($patient->Sex ?? ''),
            'age_year' => $patient->AgeYear,
            'age_month' => $patient->AgeMonth,
            'age_day' => $patient->AgeDay,
            'address1' => trim($patient->Address1 ?? ''),
            'address2' => trim($patient->Address2 ?? ''),
            'mobile' => trim($patient->MobileNo ?? ''),
        ]);
    }
    
    return response()->json(null);
});

// 3. Autocomplete Search by Name
Route::get('/api/patients/search-name', function (Request $request) {
    if (!checkPatientTableExists()) {
        return response()->json([]);
    }
    
    $search = $request->query('search', '');
    if (strlen($search) < 2) {
        return response()->json([]);
    }
    
    $patients = DB::table('MPatient')
        ->where('Name', 'like', '%' . $search . '%')
        ->orderBy('Name', 'asc')
        ->take(30)
        ->get()
        ->map(function ($p) {
            return [
                'code' => trim($p->Code ?? ''),
                'prefix' => trim($p->Prefix ?? ''),
                'name' => trim($p->Name ?? ''),
                'sex' => trim($p->Sex ?? ''),
                'age_year' => $p->AgeYear,
                'age_month' => $p->AgeMonth,
                'age_day' => $p->AgeDay,
                'address1' => trim($p->Address1 ?? ''),
                'address2' => trim($p->Address2 ?? ''),
                'mobile' => trim($p->MobileNo ?? ''),
            ];
        });
        
    return response()->json($patients);
});

// 4. Autocomplete Search by Phone
Route::get('/api/patients/search-phone', function (Request $request) {
    if (!checkPatientTableExists()) {
        return response()->json([]);
    }
    
    $phone = $request->query('phone', '');
    if (strlen($phone) < 2) {
        return response()->json([]);
    }
    
    $patients = DB::table('MPatient')
        ->where('MobileNo', 'like', '%' . $phone . '%')
        ->orderBy('Name', 'asc')
        ->take(30)
        ->get()
        ->map(function ($p) {
            return [
                'code' => trim($p->Code ?? ''),
                'prefix' => trim($p->Prefix ?? ''),
                'name' => trim($p->Name ?? ''),
                'sex' => trim($p->Sex ?? ''),
                'age_year' => $p->AgeYear,
                'age_month' => $p->AgeMonth,
                'age_day' => $p->AgeDay,
                'address1' => trim($p->Address1 ?? ''),
                'address2' => trim($p->Address2 ?? ''),
                'mobile' => trim($p->MobileNo ?? ''),
            ];
        });
        
    return response()->json($patients);
});

// 5. Patient Master Paginated list & CRUD
Route::get('/api/master/patients', function (Request $request) {
    if (!checkPatientTableExists()) {
        return response()->json(['error' => 'Patient master table not implemented.'], 400);
    }
    
    $search = $request->query('search', '');
    $perPage = intval($request->query('per_page', 25));
    
    $query = DB::table('MPatient');
    if ($search !== '') {
        $query->where(function($q) use ($search) {
            $q->where('Name', 'like', '%' . $search . '%')
              ->orWhere('Code', 'like', '%' . $search . '%')
              ->orWhere('MobileNo', 'like', '%' . $search . '%');
        });
    }
    
    $paginator = $query->orderByRaw("TRY_CAST(SUBSTRING(Code, 2, LEN(Code)) AS INT) desc")->paginate($perPage);
    return response()->json($paginator);
});

function getNextPatientCode() {
    if (!checkPatientTableExists()) return 'P1000';
    $maxRecord = DB::table('MPatient')
        ->selectRaw("MAX(TRY_CAST(SUBSTRING(Code, 2, LEN(Code)) AS INT)) as max_num")
        ->first();
    $num = $maxRecord && $maxRecord->max_num !== null ? intval($maxRecord->max_num) + 1 : 1000;
    if ($num < 1000) $num = 1000;
    return 'P' . $num;
}

Route::post('/api/master/patients', function (Request $request) {
    if (!checkPatientTableExists()) {
        return response()->json(['error' => 'Patient table does not exist.'], 400);
    }
    
    $data = $request->validate([
        'Prefix' => 'nullable|string',
        'Name' => 'required|string',
        'Sex' => 'nullable|string',
        'AgeYear' => 'nullable|integer',
        'AgeMonth' => 'nullable|integer',
        'AgeDay' => 'nullable|integer',
        'Address1' => 'nullable|string',
        'Address2' => 'nullable|string',
        'MobileNo' => 'nullable|string',
    ]);
    
    $code = getNextPatientCode();
    
    $dbData = [
        'Code' => $code,
        'Prefix' => $data['Prefix'] ?? '',
        'Name' => $data['Name'],
        'Sex' => $data['Sex'] ?? '',
        'AgeYear' => $data['AgeYear'] ?? null,
        'AgeMonth' => $data['AgeMonth'] ?? null,
        'AgeDay' => $data['AgeDay'] ?? null,
        'Address1' => $data['Address1'] ?? '',
        'Address2' => $data['Address2'] ?? '',
        'MobileNo' => $data['MobileNo'] ?? '',
        'AddDate' => now()
    ];
    
    DB::table('MPatient')->insert($dbData);
    
    return response()->json(['message' => 'Patient created successfully', 'code' => $code]);
});

Route::put('/api/master/patients/{code}', function (Request $request, $code) {
    if (!checkPatientTableExists()) {
        return response()->json(['error' => 'Patient table does not exist.'], 400);
    }
    
    $data = $request->validate([
        'Prefix' => 'nullable|string',
        'Name' => 'required|string',
        'Sex' => 'nullable|string',
        'AgeYear' => 'nullable|integer',
        'AgeMonth' => 'nullable|integer',
        'AgeDay' => 'nullable|integer',
        'Address1' => 'nullable|string',
        'Address2' => 'nullable|string',
        'MobileNo' => 'nullable|string',
    ]);
    
    $dbData = [
        'Prefix' => $data['Prefix'] ?? '',
        'Name' => $data['Name'],
        'Sex' => $data['Sex'] ?? '',
        'AgeYear' => $data['AgeYear'] ?? null,
        'AgeMonth' => $data['AgeMonth'] ?? null,
        'AgeDay' => $data['AgeDay'] ?? null,
        'Address1' => $data['Address1'] ?? '',
        'Address2' => $data['Address2'] ?? '',
        'MobileNo' => $data['MobileNo'] ?? '',
        'ModDate' => now()
    ];
    
    $formattedCode = (strpos(strtoupper($code), 'P') === 0) ? $code : 'P' . $code;
    DB::table('MPatient')->where('Code', $formattedCode)->update($dbData);
    
    return response()->json(['message' => 'Patient updated successfully']);
});

Route::delete('/api/master/patients/{code}', function ($code) {
    if (!checkPatientTableExists()) {
        return response()->json(['error' => 'Patient table does not exist.'], 400);
    }
    
    $formattedCode = (strpos(strtoupper($code), 'P') === 0) ? $code : 'P' . $code;
    DB::table('MPatient')->where('Code', $formattedCode)->delete();
    
    return response()->json(['message' => 'Patient deleted successfully']);
});

// ==========================================
// TRANSACTIONS & BOOKING APIs (Web Tables + Archive Viewer)
// ==========================================

// 1. Get Next Booking Number & Financial Year for Web Booking (Starts at 1001)
Route::get('/api/booking/next-no', function () {
    $latest = DB::table('tbl_web_booking_hdr')
        ->selectRaw("MAX(serial_no) as max_num")
        ->first();
        
    $nextNum = ($latest && $latest->max_num !== null) ? intval($latest->max_num) + 1 : 1001;
    $paddedSerial = str_pad($nextNum, 5, '0', STR_PAD_LEFT);
    
    $today = new DateTime();
    $m = intval($today->format('n'));
    $y = intval($today->format('Y'));
    $startYear = $m < 4 ? $y - 1 : $y;
    $endYear = $startYear + 1;
    $fyPrefix = substr($startYear, -2) . '-' . substr($endYear, -2);
    
    $fullDisplayNo = "BK/$fyPrefix/$paddedSerial";
    
    return response()->json([
        'serial' => $paddedSerial,
        'booking_no' => $fullDisplayNo,
        'fin_year' => $fyPrefix,
        'next_num' => $nextNum
    ]);
});

// 2. Save/Update Booking API (Support for Edit Mode vs New Booking)
Route::post('/api/booking/save', function (Request $request) {
    $data = $request->validate([
        'existingBookingNo' => 'nullable|string',
        'patientCode' => 'nullable|string',
        'prefix' => 'nullable|string',
        'patientName' => 'required|string',
        'sex' => 'nullable|string',
        'age' => 'nullable|integer',
        'ageUnit' => 'nullable|string',
        'phone' => 'nullable|string',
        'address' => 'nullable|string',
        'referredBy' => 'nullable|string',
        'selectedDoctor' => 'nullable|array',
        'selectedCategory' => 'nullable|string',
        'selectedCollector' => 'nullable|string',
        'selectedTests' => 'required|array',
        'discountType' => 'nullable|string',
        'discountValue' => 'nullable|numeric',
        'receivedAmount' => 'nullable|numeric',
        'paymentMethod' => 'nullable|string',
    ]);
    
    return DB::transaction(function () use ($data) {
        $existingBkNo = trim($data['existingBookingNo'] ?? '');
        $existingHdr = null;
        if ($existingBkNo !== '') {
            $existingHdr = DB::table('tbl_web_booking_hdr')->where('booking_no', $existingBkNo)->first();
        }

        $subtotal = 0;
        foreach ($data['selectedTests'] as $test) {
            $subtotal += floatval($test['price'] ?? 0);
        }
        
        $discVal = floatval($data['discountValue'] ?? 0);
        $discount = 0;
        if (($data['discountType'] ?? 'percent') === 'percent') {
            $discount = round($subtotal * ($discVal / 100), 2);
        } else {
            $discount = $discVal;
        }
        if ($discount > $subtotal) $discount = $subtotal;
        
        $netAmount = $subtotal - $discount;
        $paidAmount = floatval($data['receivedAmount'] ?? 0);
        $dueAmount = $netAmount - $paidAmount;
        if ($dueAmount < 0) $dueAmount = 0;
        
        $payStatus = 'UNPAID';
        if ($dueAmount <= 0 && $netAmount > 0) {
            $payStatus = 'FULL';
        } else if ($paidAmount > 0) {
            $payStatus = 'PARTIAL';
        }
        
        $drCode = isset($data['selectedDoctor']['code']) && !empty($data['selectedDoctor']['code']) ? $data['selectedDoctor']['code'] : 'D0000001';
        $drName = isset($data['selectedDoctor']['name']) ? $data['selectedDoctor']['name'] : ($data['referredBy'] ?? 'SELF');
        $catCode = !empty($data['selectedCategory']) ? $data['selectedCategory'] : 'CG1';
        
        $ageYear = ($data['ageUnit'] ?? 'Yrs') === 'Yrs' ? intval($data['age'] ?? 0) : null;
        $ageMonth = ($data['ageUnit'] ?? '') === 'Mths' ? intval($data['age'] ?? 0) : null;
        $ageDay = ($data['ageUnit'] ?? '') === 'Days' ? intval($data['age'] ?? 0) : null;

        if ($existingHdr) {
            // UPDATE EXISTING BOOKING (Keep same booking_no & serial_no)
            $fullDisplayNo = $existingHdr->booking_no;
            $paddedSerial = str_pad($existingHdr->serial_no, 5, '0', STR_PAD_LEFT);
            $fyPrefix = $existingHdr->fin_year;
            $hdrId = $existingHdr->id;

            $newSessionPaid = floatval($data['receivedAmount'] ?? 0);
            $prevPaid = floatval($existingHdr->paid_amount ?? 0);
            $totalPaidAmount = $prevPaid + $newSessionPaid;

            $dueAmount = $netAmount - $totalPaidAmount;
            if ($dueAmount < 0) $dueAmount = 0;

            $payStatus = 'UNPAID';
            if ($dueAmount <= 0 && $netAmount > 0) {
                $payStatus = 'FULL';
            } else if ($totalPaidAmount > 0) {
                $payStatus = 'PARTIAL';
            }

            DB::table('tbl_web_booking_hdr')->where('id', $hdrId)->update([
                'patient_code' => $data['patientCode'] ?? '',
                'patient_prefix' => $data['prefix'] ?? 'Mr.',
                'patient_name' => $data['patientName'],
                'sex' => $data['sex'] ?? 'Male',
                'age_year' => $ageYear,
                'age_month' => $ageMonth,
                'age_day' => $ageDay,
                'address' => $data['address'] ?? '',
                'mobile_no' => $data['phone'] ?? '',
                'doctor_code' => $drCode,
                'doctor_name' => $drName,
                'category_code' => $catCode,
                'collector_code' => $data['selectedCollector'] ?? '',
                'subtotal_amount' => $subtotal,
                'discount_type' => $data['discountType'] ?? 'percent',
                'discount_value' => $discVal,
                'discount_amount' => $discount,
                'net_amount' => $netAmount,
                'paid_amount' => $totalPaidAmount,
                'due_amount' => $dueAmount,
                'payment_status' => $payStatus,
                'payment_method' => $data['paymentMethod'] ?? 'Cash',
                'updated_at' => now(),
            ]);

            // Re-sync Line Items
            DB::table('tbl_web_booking_dtl')->where('booking_id', $hdrId)->delete();
            foreach ($data['selectedTests'] as $test) {
                $tCode = $test['code'];
                $mTest = DB::table('MTest as t')
                    ->leftJoin('MDepartment as md', 't.DeptCode', '=', 'md.Code')
                    ->select('t.DeptCode', 'md.Descr as DeptName')
                    ->where('t.Code', $tCode)
                    ->first();

                $dCode = $mTest->DeptCode ?? ($test['dept_code'] ?? 'DP000001');
                $dName = $mTest->DeptName ?? ($test['dept_name'] ?? 'PATHOLOGY');

                DB::table('tbl_web_booking_dtl')->insert([
                    'booking_id' => $hdrId,
                    'booking_no' => $fullDisplayNo,
                    'test_code' => $tCode,
                    'test_name' => $test['name'] ?? $tCode,
                    'dept_code' => $dCode,
                    'dept_name' => $dName,
                    'subdept_code' => $mTest->SubDeptCode ?? '',
                    'rate' => floatval($test['price'] ?? 0),
                    'qty' => 1,
                    'amount' => floatval($test['price'] ?? 0),
                    'sample_status' => 'PENDING',
                    'delivery_date' => $test['delivery_date'] ?? null,
                    'collector_code' => $data['selectedCollector'] ?? '',
                    'created_at' => now(),
                ]);
            }

            // Sync payment ledger entry if fresh payment was received in this session
            if ($newSessionPaid > 0) {
                $seq = DB::table('tbl_web_payments')->where('booking_id', $hdrId)->count() + 1;
                DB::table('tbl_web_payments')->insert([
                    'booking_id' => $hdrId,
                    'booking_no' => $fullDisplayNo,
                    'receipt_no' => "RCP/$fyPrefix/$paddedSerial-P$seq",
                    'part_payment_seq' => $seq,
                    'amount' => $newSessionPaid,
                    'payment_mode' => $data['paymentMethod'] ?? 'Cash',
                    'received_by' => getCurrentUserName($request ?? null),
                    'created_at' => now(),
                ]);
            }

            // Sync existing invoice header if an invoice was already generated
            $existingInv = DB::table('tbl_web_invoice_hdr')->where('booking_id', $hdrId)->first();
            if ($existingInv) {
                $invStatus = ($dueAmount <= 0 && $netAmount > 0) ? 'FULLY PAID' : 'PARTIALLY PAID';
                DB::table('tbl_web_invoice_hdr')->where('id', $existingInv->id)->update([
                    'subtotal_amount' => $subtotal,
                    'discount_value' => $discVal,
                    'net_amount' => $netAmount,
                    'paid_amount' => $totalPaidAmount,
                    'due_amount' => $dueAmount,
                    'invoice_status' => $invStatus,
                ]);
            }

            return response()->json([
                'message' => 'Web booking updated successfully',
                'bookingNo' => $fullDisplayNo,
                'serial' => $paddedSerial,
                'hdr_id' => $hdrId,
                'is_updated' => true
            ]);

        } else {
            // CREATE NEW BOOKING
            $latest = DB::table('tbl_web_booking_hdr')
                ->selectRaw("MAX(serial_no) as max_num")
                ->first();
                
            $nextNum = ($latest && $latest->max_num !== null) ? intval($latest->max_num) + 1 : 1001;
            $paddedSerial = str_pad($nextNum, 5, '0', STR_PAD_LEFT);
            
            $today = new DateTime();
            $m = intval($today->format('n'));
            $y = intval($today->format('Y'));
            $startYear = $m < 4 ? $y - 1 : $y;
            $endYear = $startYear + 1;
            $fyPrefix = substr($startYear, -2) . '-' . substr($endYear, -2);
            $fullDisplayNo = "BK/$fyPrefix/$paddedSerial";

            $hdrId = DB::table('tbl_web_booking_hdr')->insertGetId([
                'booking_no' => $fullDisplayNo,
                'serial_no' => $nextNum,
                'fin_year' => $fyPrefix,
                'booking_date' => now(),
                'patient_code' => $data['patientCode'] ?? '',
                'patient_prefix' => $data['prefix'] ?? 'Mr.',
                'patient_name' => $data['patientName'],
                'sex' => $data['sex'] ?? 'Male',
                'age_year' => $ageYear,
                'age_month' => $ageMonth,
                'age_day' => $ageDay,
                'address' => $data['address'] ?? '',
                'mobile_no' => $data['phone'] ?? '',
                'doctor_code' => $drCode,
                'doctor_name' => $drName,
                'category_code' => $catCode,
                'collector_code' => $data['selectedCollector'] ?? '',
                'subtotal_amount' => $subtotal,
                'discount_type' => $data['discountType'] ?? 'percent',
                'discount_value' => $discVal,
                'discount_amount' => $discount,
                'net_amount' => $netAmount,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'payment_status' => $payStatus,
                'payment_method' => $data['paymentMethod'] ?? 'Cash',
                'report_status' => 'PENDING',
                'status' => 'ACTIVE',
                'created_by' => getCurrentUserCode($request ?? null),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            // Insert Line Items
            foreach ($data['selectedTests'] as $test) {
                $tCode = $test['code'];
                $mTest = DB::table('MTest as t')
                    ->leftJoin('MDepartment as md', 't.DeptCode', '=', 'md.Code')
                    ->select('t.DeptCode', 'md.Descr as DeptName')
                    ->where('t.Code', $tCode)
                    ->first();

                $dCode = $mTest->DeptCode ?? ($test['dept_code'] ?? 'DP000001');
                $dName = $mTest->DeptName ?? ($test['dept_name'] ?? 'PATHOLOGY');

                DB::table('tbl_web_booking_dtl')->insert([
                    'booking_id' => $hdrId,
                    'booking_no' => $fullDisplayNo,
                    'test_code' => $tCode,
                    'test_name' => $test['name'] ?? $tCode,
                    'dept_code' => $dCode,
                    'dept_name' => $dName,
                    'subdept_code' => $mTest->SubDeptCode ?? '',
                    'rate' => floatval($test['price'] ?? 0),
                    'qty' => 1,
                    'amount' => floatval($test['price'] ?? 0),
                    'sample_status' => 'PENDING',
                    'delivery_date' => $test['delivery_date'] ?? null,
                    'collector_code' => $data['selectedCollector'] ?? '',
                    'created_at' => now(),
                ]);
            }
            
            // Insert Payment Ledger Record
            if ($paidAmount > 0) {
                DB::table('tbl_web_payments')->insert([
                    'booking_id' => $hdrId,
                    'booking_no' => $fullDisplayNo,
                    'receipt_no' => "RCP/$fyPrefix/$paddedSerial-P1",
                    'part_payment_seq' => 1,
                    'amount' => $paidAmount,
                    'payment_mode' => $data['paymentMethod'] ?? 'Cash',
                    'received_by' => getCurrentUserName($request ?? null),
                    'created_at' => now(),
                ]);
            }
            
            return response()->json([
                'message' => 'Web booking saved successfully',
                'bookingNo' => $fullDisplayNo,
                'serial' => $paddedSerial,
                'hdr_id' => $hdrId,
                'is_updated' => false
            ]);
        }
    });
});

// 3. Search Booking by Serial / Booking Number (Strictly Web Database tbl_web_booking_hdr)
Route::get('/api/booking/by-no/{serial}', function ($serial) {
    $cleanSerial = trim($serial);
    $numSerial = intval($cleanSerial);
    $paddedSerial = str_pad($numSerial, 5, '0', STR_PAD_LEFT);
    
    // Search in tbl_web_booking_hdr only (New Web App Data)
    $webHdr = DB::table('tbl_web_booking_hdr')
        ->where('booking_no', 'like', "%/$paddedSerial%")
        ->orWhere('serial_no', $numSerial)
        ->orWhere('booking_no', $cleanSerial)
        ->first();
        
    if (!$webHdr) {
        return response()->json([
            'error' => 'Web booking serial not found.'
        ], 404);
    }
    
    $dtl = DB::table('tbl_web_booking_dtl as d')
        ->leftJoin('MTest as t', 'd.test_code', '=', 't.Code')
        ->leftJoin('MDepartment as md', 't.DeptCode', '=', 'md.Code')
        ->where('d.booking_id', $webHdr->id)
        ->select('d.*', 'md.Descr as dept_name')
        ->get();
        
    $tests = $dtl->map(function($t) {
        return [
            'code' => trim($t->test_code ?? ''),
            'name' => trim($t->test_name ?? $t->test_code),
            'dept_name' => trim($t->dept_name ?? 'GENERAL'),
            'price' => floatval($t->amount ?? 0),
            'delivery_date' => trim($t->delivery_date ?? ''),
        ];
    });

    $pmts = DB::table('tbl_web_payments')->where('booking_id', $webHdr->id)->get();
    $paymentsList = $pmts->map(function($p) {
        return [
            'receipt_no' => $p->receipt_no ?? '',
            'date' => $p->created_at ? (new DateTime($p->created_at))->format('d-M-Y h:i A') : '',
            'amount' => floatval($p->amount ?? 0),
            'mode' => $p->payment_mode ?? 'Cash',
            'received_by' => $p->received_by ?? 'Admin'
        ];
    });

    if ($paymentsList->isEmpty() && floatval($webHdr->paid_amount) > 0) {
        $paddedSer = str_pad($webHdr->serial_no, 5, '0', STR_PAD_LEFT);
        $fyPref = $webHdr->fin_year ?? '26-27';
        $paymentsList = collect([[
            'receipt_no' => "RCP/$fyPref/$paddedSer-P1",
            'date' => $webHdr->created_at ? (new DateTime($webHdr->created_at))->format('d-M-Y h:i A') : (new DateTime())->format('d-M-Y h:i A'),
            'amount' => floatval($webHdr->paid_amount),
            'mode' => $webHdr->payment_method ?? 'Cash',
            'received_by' => 'Admin'
        ]]);
    }
    
    return response()->json([
        'is_legacy' => false,
        'bookingNo' => $webHdr->booking_no,
        'patientCode' => trim($webHdr->patient_code ?? ''),
        'prefix' => trim($webHdr->patient_prefix ?? 'Mr.'),
        'patientName' => trim($webHdr->patient_name ?? ''),
        'sex' => trim($webHdr->sex ?? ''),
        'age' => $webHdr->age_year ?? $webHdr->age_month ?? $webHdr->age_day ?? '',
        'ageUnit' => $webHdr->age_year ? 'Yrs' : ($webHdr->age_month ? 'Mths' : 'Days'),
        'phone' => trim($webHdr->mobile_no ?? ''),
        'address' => trim($webHdr->address ?? ''),
        'referredBy' => trim($webHdr->doctor_name ?? ''),
        'selectedDoctor' => [
            'code' => trim($webHdr->doctor_code ?? ''),
            'name' => trim($webHdr->doctor_name ?? '')
        ],
        'selectedTests' => $tests,
        'payments' => $paymentsList,
        'subtotal' => floatval($webHdr->subtotal_amount ?? 0),
        'discountValue' => floatval($webHdr->discount_value ?? 0),
        'discountType' => trim($webHdr->discount_type ?? 'percent'),
        'netAmount' => floatval($webHdr->net_amount ?? 0),
        'advAmount' => floatval($webHdr->paid_amount ?? 0),
        'paymentMethod' => trim($webHdr->payment_method ?? 'Cash'),
        'date' => $webHdr->booking_date ? (new DateTime($webHdr->booking_date))->format('Y-m-d H:i:s') : '',
        'created_at_formatted' => $webHdr->created_at ? (new DateTime($webHdr->created_at))->format('d-M-Y h:i A') : ($webHdr->booking_date ? (new DateTime($webHdr->booking_date))->format('d-M-Y h:i A') : ''),
        'created_by_user' => 'Admin',
    ]);
});

// 4. Get 5 Recent Bookings (From tbl_web_booking_hdr)
Route::get('/api/booking/recent', function () {
    $recent = DB::table('tbl_web_booking_hdr')
        ->orderBy('created_at', 'desc')
        ->take(5)
        ->get()
        ->map(function ($h) {
            return [
                'bookingNo' => trim($h->booking_no ?? ''),
                'patientName' => trim($h->patient_name ?? ''),
                'prefix' => trim($h->patient_prefix ?? ''),
                'amount' => floatval($h->net_amount ?? 0),
                'date' => $h->created_at ? (new DateTime($h->created_at))->format('d/m/Y H:i') : '',
            ];
        });
        
    return response()->json($recent);
});

// 5. ARCHIVE BILLS APIs (Strictly Read-Only Legacy TBookingHDR Viewer)
Route::get('/api/booking/archive', function (Request $request) {
    $search = trim($request->query('search', ''));
    $fromDate = $request->query('from_date');
    $toDate = $request->query('to_date');
    $perPage = intval($request->query('per_page', 25));

    $query = DB::table('TBookingHDR as h')
        ->leftJoin('MDoctor as d', 'h.DrCode', '=', 'd.Code');

    if ($search !== '') {
        $query->where(function($q) use ($search) {
            $q->where('h.PName', 'like', '%' . $search . '%')
              ->orWhere('h.BookingNo', 'like', '%' . $search . '%')
              ->orWhere('h.MobileNo', 'like', '%' . $search . '%');
        });
    }

    if ($fromDate) {
        $query->whereDate('h.AddDate', '>=', $fromDate);
    }
    if ($toDate) {
        $query->whereDate('h.AddDate', '<=', $toDate);
    }

    $paginator = $query->select(
        'h.BookingNo',
        'h.PPrefix',
        'h.PName',
        'h.Sex',
        'h.AgeYear',
        'h.AgeMonth',
        'h.AgeDay',
        'h.MobileNo',
        'h.Address1',
        'h.TotalTestAmount',
        'h.DiscAmount',
        'h.NetAmount',
        'h.AdvAmount',
        'h.PaymentType',
        'h.AddDate',
        'd.DoctName as DoctorName'
    )
    ->orderBy('h.AddDate', 'desc')
    ->paginate($perPage);

    return response()->json($paginator);
});

// 6. ARCHIVE BILL Single Read-Only Detail
Route::get('/api/booking/archive/{bookingNo}', function ($bookingNo) {
    $hdr = DB::table('TBookingHDR as h')
        ->leftJoin('MDoctor as d', 'h.DrCode', '=', 'd.Code')
        ->where('h.BookingNo', $bookingNo)
        ->select('h.*', 'd.DoctName as DoctorName')
        ->first();

    if (!$hdr) {
        return response()->json(['error' => 'Archive booking not found.'], 404);
    }

    $dtl = DB::table('TBookingDTL as d')
        ->leftJoin('MTest as t', 'd.TestCode', '=', 't.Code')
        ->where('d.BookingNo', $hdr->BookingNo)
        ->select('d.*', 't.Descr as TestName')
        ->get();

    $tests = $dtl->map(function($t) {
        return [
            'code' => trim($t->TestCode ?? ''),
            'name' => trim($t->TestName ?? $t->TestCode),
            'price' => floatval($t->Amount ?? 0),
        ];
    });

    return response()->json([
        'bookingNo' => trim($hdr->BookingNo ?? ''),
        'patientCode' => trim($hdr->PatientID ?? ''),
        'prefix' => trim($hdr->PPrefix ?? 'Mr.'),
        'patientName' => trim($hdr->PName ?? ''),
        'sex' => trim($hdr->Sex ?? ''),
        'age' => $hdr->AgeYear ?? $hdr->AgeMonth ?? $hdr->AgeDay ?? '',
        'ageUnit' => $hdr->AgeYear ? 'Yrs' : ($hdr->AgeMonth ? 'Mths' : 'Days'),
        'phone' => trim($hdr->MobileNo ?? ''),
        'address' => trim($hdr->Address1 ?? ''),
        'referredBy' => trim($hdr->DoctorName ?? 'Self'),
        'selectedTests' => $tests,
        'subtotal' => floatval($hdr->TotalTestAmount ?? 0),
        'discountValue' => floatval($hdr->DiscAmount ?? 0),
        'netAmount' => floatval($hdr->NetAmount ?? 0),
        'advAmount' => floatval($hdr->AdvAmount ?? 0),
        'paymentMethod' => trim($hdr->PaymentType ?? 'Cash'),
        'date' => $hdr->AddDate ? (new DateTime($hdr->AddDate))->format('Y-m-d H:i:s') : '',
    ]);
});

// 7. SYSTEM DATABASE MIGRATION INITIALIZER (1-Click Production Database Swap Support)
Route::get('/api/system/initialize-db', function () {
    try {
        Artisan::call('migrate', ['--force' => true]);
        return response()->json([
            'status' => 'success',
            'message' => 'Web tables (tbl_web_booking_hdr, tbl_web_booking_dtl, tbl_web_payments, tbl_web_invoice_hdr) verified and created successfully.'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage()
        ], 500);
    }
});

// 8. DEDICATED FINAL INVOICE APIs (INV/26-27/01001)
Route::get('/api/invoice/next-no', function () {
    $finYear = getCurrentFinYear();
    $maxSerial = DB::table('tbl_web_invoice_hdr')->max('serial_no');
    $nextSerial = $maxSerial ? intval($maxSerial) + 1 : 1001;
    $paddedSerial = str_pad($nextSerial, 5, '0', STR_PAD_LEFT);
    $invoiceNo = "INV/$finYear/$paddedSerial";

    return response()->json([
        'serial' => $paddedSerial,
        'invoice_no' => $invoiceNo,
        'fin_year' => $finYear,
        'next_num' => $nextSerial
    ]);
});

Route::post('/api/invoice/generate', function (Request $request) {
    $bookingNo = trim($request->input('bookingNo', ''));
    $collectAmount = floatval($request->input('collectAmount', 0));
    $paymentMode = trim($request->input('paymentMode', 'Cash'));

    if (!$bookingNo) {
        return response()->json(['error' => 'Booking number is required.'], 400);
    }

    $hdr = DB::table('tbl_web_booking_hdr')->where('booking_no', $bookingNo)->first();
    if (!$hdr) {
        return response()->json(['error' => 'Web booking not found.'], 404);
    }

    $finYear = getCurrentFinYear();

    // If collectAmount > 0, record payment in ledger & update booking header
    if ($collectAmount > 0) {
        $prevPaid = floatval($hdr->paid_amount ?? 0);
        $newTotalPaid = $prevPaid + $collectAmount;
        $netAmt = floatval($hdr->net_amount ?? 0);
        $newDue = $netAmt - $newTotalPaid;
        if ($newDue < 0) $newDue = 0;
        $payStatus = ($newDue <= 0 && $netAmt > 0) ? 'FULL' : 'PARTIAL';

        DB::table('tbl_web_booking_hdr')->where('id', $hdr->id)->update([
            'paid_amount' => $newTotalPaid,
            'due_amount' => $newDue,
            'payment_status' => $payStatus,
            'updated_at' => now(),
        ]);

        $seq = DB::table('tbl_web_payments')->where('booking_id', $hdr->id)->count() + 1;
        $paddedSer = str_pad($hdr->serial_no, 5, '0', STR_PAD_LEFT);
        DB::table('tbl_web_payments')->insert([
            'booking_id' => $hdr->id,
            'booking_no' => $hdr->booking_no,
            'receipt_no' => "RCP/$finYear/$paddedSer-P$seq",
            'part_payment_seq' => $seq,
            'amount' => $collectAmount,
            'payment_mode' => $paymentMode,
            'received_by' => getCurrentUserName($request ?? null),
            'created_at' => now(),
        ]);

        // Re-fetch updated booking header
        $hdr = DB::table('tbl_web_booking_hdr')->where('id', $hdr->id)->first();
    }

    $netAmt = floatval($hdr->net_amount ?? 0);
    $paidAmt = floatval($hdr->paid_amount ?? 0);
    $dueAmt = floatval($hdr->due_amount ?? 0);
    $invoiceStatus = ($dueAmt <= 0 && $netAmt > 0) ? 'FULLY PAID' : 'PARTIALLY PAID';

    // Check if invoice already exists
    $existingInv = DB::table('tbl_web_invoice_hdr')->where('booking_id', $hdr->id)->first();
    if ($existingInv) {
        DB::table('tbl_web_invoice_hdr')->where('id', $existingInv->id)->update([
            'subtotal_amount' => $hdr->subtotal_amount,
            'discount_value' => $hdr->discount_value,
            'net_amount' => $netAmt,
            'paid_amount' => $paidAmt,
            'due_amount' => $dueAmt,
            'invoice_status' => $invoiceStatus,
        ]);

        return response()->json([
            'message' => 'Invoice updated with latest settlement ledger.',
            'invoice_no' => $existingInv->invoice_no,
            'id' => $existingInv->id,
            'status' => $invoiceStatus,
            'due_amount' => $dueAmt,
            'paid_amount' => $paidAmt
        ]);
    }

    $maxSerial = DB::table('tbl_web_invoice_hdr')->max('serial_no');
    $nextSerial = $maxSerial ? intval($maxSerial) + 1 : 1001;
    $paddedSerial = str_pad($nextSerial, 5, '0', STR_PAD_LEFT);
    $invoiceNo = "INV/$finYear/$paddedSerial";

    $invId = DB::table('tbl_web_invoice_hdr')->insertGetId([
        'invoice_no' => $invoiceNo,
        'serial_no' => $nextSerial,
        'fin_year' => $finYear,
        'booking_id' => $hdr->id,
        'booking_no' => $hdr->booking_no,
        'invoice_date' => now(),
        'patient_code' => $hdr->patient_code,
        'patient_name' => $hdr->patient_name,
        'subtotal_amount' => $hdr->subtotal_amount,
        'discount_value' => $hdr->discount_value,
        'net_amount' => $netAmt,
        'paid_amount' => $paidAmt,
        'due_amount' => $dueAmt,
        'invoice_status' => $invoiceStatus,
        'created_at' => now(),
        'created_by' => getCurrentUserName($request ?? null),
    ]);

    return response()->json([
        'message' => 'Final invoice generated successfully.',
        'invoice_no' => $invoiceNo,
        'id' => $invId,
        'status' => $invoiceStatus,
        'due_amount' => $dueAmt,
        'paid_amount' => $paidAmt
    ]);
});

Route::get('/api/invoice/list', function (Request $request) {
    $search = trim($request->query('search', ''));
    $perPage = intval($request->query('per_page', 25));

    $query = DB::table('tbl_web_invoice_hdr as i')
        ->leftJoin('tbl_web_booking_hdr as b', function($join) {
            $join->on('i.booking_id', '=', 'b.id')
                 ->orOn('i.booking_no', '=', 'b.booking_no');
        });

    if ($search !== '') {
        $query->where(function($q) use ($search) {
            $q->where('i.invoice_no', 'like', "%$search%")
              ->orWhere('i.booking_no', 'like', "%$search%")
              ->orWhere('i.patient_name', 'like', "%$search%")
              ->orWhere('b.patient_name', 'like', "%$search%");
        });
    }

    $invoices = $query->select(
        'i.*',
        'b.patient_prefix',
        'b.sex',
        'b.age_year',
        'b.mobile_no',
        'b.address',
        'b.doctor_name'
    )->orderBy('i.created_at', 'desc')->paginate($perPage);

    return response()->json($invoices);
});

if (!function_exists('getInvoiceDetailsResponse')) {
    function getInvoiceDetailsResponse($invoiceNoInput) {
        $cleanNo = trim(urldecode($invoiceNoInput));
        
        $numNo = intval(preg_replace('/[^0-9]/', '', $cleanNo));
        $paddedNo = $numNo > 0 ? str_pad($numNo, 5, '0', STR_PAD_LEFT) : '';

        $inv = DB::table('tbl_web_invoice_hdr as i')
            ->leftJoin('tbl_web_booking_hdr as b', function($join) {
                $join->on('i.booking_id', '=', 'b.id')
                     ->orOn('i.booking_no', '=', 'b.booking_no');
            })
            ->where(function($q) use ($cleanNo, $numNo, $paddedNo) {
                $q->where('i.invoice_no', $cleanNo)
                  ->orWhere('i.booking_no', $cleanNo);
                if ($numNo > 0) {
                    $q->orWhere('i.invoice_no', 'like', "%/$paddedNo")
                      ->orWhere('i.serial_no', $numNo);
                }
            })
            ->select(
                'i.*',
                'b.patient_prefix as bk_prefix',
                'b.patient_name as bk_patient_name',
                'b.sex as bk_sex',
                'b.age_year as bk_age_year',
                'b.mobile_no as bk_mobile_no',
                'b.address as bk_address',
                'b.doctor_name as bk_doctor_name'
            )->first();

        if (!$inv) {
            return response()->json(['error' => 'Invoice not found.'], 404);
        }

        $dtl = DB::table('tbl_web_booking_dtl')
            ->where(function($q) use ($inv) {
                if (!empty($inv->booking_id)) $q->where('booking_id', $inv->booking_id);
                if (!empty($inv->booking_no)) $q->orWhere('booking_no', $inv->booking_no);
            })
            ->get();

        $pmts = DB::table('tbl_web_payments')
            ->where(function($q) use ($inv) {
                if (!empty($inv->booking_id)) $q->where('booking_id', $inv->booking_id);
                if (!empty($inv->booking_no)) $q->orWhere('booking_no', $inv->booking_no);
            })
            ->get();

        return response()->json([
            'invoiceNo' => $inv->invoice_no,
            'bookingNo' => $inv->booking_no,
            'patientCode' => $inv->patient_code,
            'prefix' => !empty($inv->bk_prefix) ? $inv->bk_prefix : 'Mr.',
            'patientName' => !empty($inv->patient_name) ? $inv->patient_name : ($inv->bk_patient_name ?? 'Guest'),
            'sex' => !empty($inv->bk_sex) ? $inv->bk_sex : 'Male',
            'age' => !empty($inv->bk_age_year) ? $inv->bk_age_year : '',
            'phone' => !empty($inv->bk_mobile_no) ? $inv->bk_mobile_no : '',
            'address' => !empty($inv->bk_address) ? $inv->bk_address : '',
            'referredBy' => !empty($inv->bk_doctor_name) ? $inv->bk_doctor_name : 'Dr. SELF',
            'subtotal' => floatval($inv->subtotal_amount),
            'discountValue' => floatval($inv->discount_value),
            'netAmount' => floatval($inv->net_amount),
            'paidAmount' => floatval($inv->paid_amount),
            'dueAmount' => floatval($inv->due_amount),
            'status' => $inv->invoice_status,
            'date_formatted' => !empty($inv->invoice_date) ? (new DateTime($inv->invoice_date))->format('d-M-Y h:i A') : '',
            'items' => $dtl->map(function($d) {
                return [
                    'code' => $d->test_code ?? '',
                    'name' => $d->test_name ?? $d->test_code ?? 'Diagnostic Test',
                    'testName' => $d->test_name ?? $d->test_code ?? 'Diagnostic Test',
                    'test_name' => $d->test_name ?? $d->test_code ?? 'Diagnostic Test',
                    'price' => floatval($d->amount ?? $d->rate ?? 0)
                ];
            }),
            'payments' => $pmts->map(function($p) {
                return [
                    'receipt_no' => $p->receipt_no ?? '',
                    'date' => !empty($p->payment_date) ? (new DateTime($p->payment_date))->format('d-M-Y h:i A') : (!empty($p->created_at) ? (new DateTime($p->created_at))->format('d-M-Y h:i A') : ''),
                    'amount' => floatval($p->amount ?? 0),
                    'mode' => $p->payment_mode ?? 'Cash'
                ];
            })
        ]);
    }
}

Route::get('/api/invoice/by-no/{invoiceNo}', function ($invoiceNo) {
    return getInvoiceDetailsResponse($invoiceNo);
})->where('invoiceNo', '.*');

Route::get('/api/invoice/details', function (Request $request) {
    $no = $request->query('inv_no', $request->query('no', ''));
    return getInvoiceDetailsResponse($no);
});

// 9. LIS SAMPLE TRACKING & WORKLIST APIs
Route::get('/api/sample-tracking/queue', function (Request $request) {
    $deptCode = trim($request->query('dept_code', ''));
    $sampleStatus = trim($request->query('sample_status', ''));
    $testStatus = trim($request->query('test_status', ''));
    $search = trim($request->query('search', ''));

    $query = DB::table('tbl_web_booking_dtl as d')
        ->join('tbl_web_booking_hdr as h', 'd.booking_id', '=', 'h.id')
        ->leftJoin('MTest as t', 'd.test_code', '=', 't.Code')
        ->leftJoin('MDepartment as md', 't.DeptCode', '=', 'md.Code')
        ->select('d.*', 'h.booking_no', 'h.patient_name', 'h.patient_prefix', 'h.mobile_no', 'h.booking_date', 'h.created_at as booking_created_at', 'md.Descr as master_dept_name');

    if ($deptCode !== '') {
        $query->where('d.dept_code', $deptCode);
    }
    if ($sampleStatus !== '') {
        $query->where('d.sample_status', $sampleStatus);
    }
    if ($testStatus !== '') {
        $query->where('d.test_status', $testStatus);
    }
    if ($search !== '') {
        $query->where(function($q) use ($search) {
            $q->where('h.booking_no', 'like', "%$search%")
              ->orWhere('h.patient_name', 'like', "%$search%")
              ->orWhere('h.mobile_no', 'like', "%$search%")
              ->orWhere('d.test_name', 'like', "%$search%");
        });
    }

    $queue = $query->orderBy('d.id', 'desc')->take(50)->get()->map(function($item) {
        $dept = !empty($item->master_dept_name) ? trim($item->master_dept_name) : (!empty($item->dept_name) ? trim($item->dept_name) : 'UNKNOWN');
        return [
            'id' => $item->id,
            'booking_id' => $item->booking_id,
            'bookingNo' => $item->booking_no,
            'patientName' => trim(($item->patient_prefix ? $item->patient_prefix . ' ' : '') . $item->patient_name),
            'phone' => $item->mobile_no,
            'testCode' => $item->test_code,
            'testName' => $item->test_name,
            'deptName' => $dept,
            'sampleStatus' => $item->sample_status ?? 'PENDING',
            'sampleCollectedAt' => !empty($item->sample_collected_at) ? (new DateTime($item->sample_collected_at))->format('d-M h:i A') : null,
            'testStatus' => $item->test_status ?? 'PENDING',
            'resultFlag' => $item->result_flag ?? 'NORMAL',
            'bookingDate' => !empty($item->booking_date) ? (new DateTime($item->booking_date))->format('d-M-Y') : ''
        ];
    });

    return response()->json($queue);
});

Route::post('/api/sample-tracking/update-sample', function (Request $request) {
    $dtlId = $request->input('id');
    $status = trim($request->input('status', 'COLLECTED')); // COLLECTED or TRANSFERRED_TO_DEPT

    if (!$dtlId) {
        return response()->json(['error' => 'Detail ID is required.'], 400);
    }

    $updateData = [
        'sample_status' => $status,
    ];

    if ($status === 'COLLECTED') {
        $updateData['sample_collected_at'] = now();
        $updateData['sample_collected_by'] = 'Phlebotomist';
    } elseif ($status === 'TRANSFERRED_TO_DEPT') {
        $updateData['dept_received_at'] = now();
        $updateData['test_status'] = 'PROCESSING';
    }

    DB::table('tbl_web_booking_dtl')->where('id', $dtlId)->update($updateData);

    return response()->json(['message' => "Sample status updated to $status successfully."]);
});


// Multi-Parameter Result Save API with Auto High/Low/Panic Flag Calculation
Route::post('/api/sample-tracking/save-parameter-results', function (Request $request) {
    $dtlId = $request->input('id');
    $sex = trim($request->input('sex', 'Male'));
    $results = $request->input('results', []);

    if (!$dtlId) {
        return response()->json(['error' => 'Detail ID is required.'], 400);
    }

    $overallFlag = 'NORMAL';
    $processedResults = [];

    foreach ($results as $item) {
        $valStr = trim(strval($item['value'] ?? ''));
        $val = floatval($valStr);
        $hasVal = ($valStr !== '');
        $isFemale = (strtoupper($sex) === 'FEMALE');

        $min = $isFemale ? floatval($item['female_min'] ?? $item['male_min'] ?? 0) : floatval($item['male_min'] ?? 0);
        $max = $isFemale ? floatval($item['female_max'] ?? $item['male_max'] ?? 0) : floatval($item['male_max'] ?? 0);
        $panicLow = floatval($item['panic_low'] ?? 0);
        $panicHigh = floatval($item['panic_high'] ?? 0);

        $flag = 'NORMAL';
        if ($hasVal) {
            if ($panicLow > 0 && $val < $panicLow) {
                $flag = 'CRITICAL_LOW';
            } elseif ($panicHigh > 0 && $val > $panicHigh) {
                $flag = 'CRITICAL_HIGH';
            } elseif ($max > 0 && $val > $max) {
                $flag = 'HIGH';
            } elseif ($min > 0 && $val < $min) {
                $flag = 'LOW';
            }
        }

        if (in_array($flag, ['CRITICAL_HIGH', 'CRITICAL_LOW'])) {
            $overallFlag = 'CRITICAL';
        } elseif ($flag === 'HIGH' && $overallFlag !== 'CRITICAL') {
            $overallFlag = 'HIGH';
        } elseif ($flag === 'LOW' && !in_array($overallFlag, ['CRITICAL', 'HIGH'])) {
            $overallFlag = 'LOW';
        }

        $processedResults[] = [
            'param_code' => $item['param_code'] ?? '',
            'param_name' => $item['param_name'] ?? '',
            'value' => $valStr,
            'unit' => $item['unit'] ?? '',
            'ref_range' => ($min > 0 || $max > 0) ? "$min - $max" : 'N/A',
            'flag' => $flag
        ];
    }

    DB::table('tbl_web_booking_dtl')->where('id', $dtlId)->update([
        'result_json' => json_encode($processedResults),
        'result_flag' => $overallFlag,
        'test_status' => 'RESULT_ENTERED',
        'result_entered_at' => now(),
        'result_entered_by' => getCurrentUserName($request ?? null)
    ]);

    return response()->json([
        'message' => 'Parameter results saved successfully.',
        'overall_flag' => $overallFlag,
        'results' => $processedResults
    ]);
});

Route::post('/api/sample-tracking/save-result', function (Request $request) {
    $dtlId = $request->input('id');
    $value = trim($request->input('value', ''));
    $flag = trim($request->input('flag', 'NORMAL')); // NORMAL, HIGH, LOW

    if (!$dtlId) {
        return response()->json(['error' => 'Detail ID is required.'], 400);
    }

    DB::table('tbl_web_booking_dtl')->where('id', $dtlId)->update([
        'result_json' => json_encode(['value' => $value]),
        'result_flag' => $flag,
        'test_status' => 'RESULT_ENTERED',
        'result_entered_at' => now(),
        'result_entered_by' => getCurrentUserName($request ?? null)
    ]);

    return response()->json(['message' => 'Result saved successfully with flag: ' . $flag]);
});

Route::post('/api/sample-tracking/verify', function (Request $request) {
    $dtlId = $request->input('id');
    if (!$dtlId) {
        return response()->json(['error' => 'Detail ID is required.'], 400);
    }

    DB::table('tbl_web_booking_dtl')->where('id', $dtlId)->update([
        'test_status' => 'VERIFIED',
        'verified_at' => now(),
        'verified_by' => 'Dr. Pathologist'
    ]);

    return response()->json(['message' => 'Test result verified and approved successfully.']);
});

// Helper function for System Audit Trail Logging
if (!function_exists('logAuditLog')) {
    function logAuditLog($userCode, $username, $moduleName, $actionType, $description, $ip = '127.0.0.1') {
        try {
            DB::table('tbl_web_audit_logs')->insert([
                'user_code' => $userCode ?? 'SYSTEM',
                'username' => $username ?? 'SYSTEM',
                'module_name' => $moduleName,
                'action_type' => strtoupper($actionType),
                'description' => $description,
                'ip_address' => $ip,
                'created_at' => now(),
            ]);
        } catch (\Exception $e) {}
    }
}

// 0. User Login API
Route::post('/api/auth/login', function (Request $request) {
    $username = trim($request->input('username', ''));
    $password = trim($request->input('password', ''));

    if (empty($username) || empty($password)) {
        return response()->json(['error' => 'Username and password are required.'], 400);
    }

    $user = DB::table('tbl_web_users as u')
        ->leftJoin('tbl_web_roles as r', 'u.role_code', '=', 'r.role_code')
        ->where('u.username', $username)
        ->select('u.*', 'r.role_name')
        ->first();

    if (!$user) {
        logAuditLog(null, $username, 'AUTHENTICATION', 'FAILED_LOGIN', 'Failed login attempt for username: ' . $username, $request->ip());
        return response()->json(['error' => 'Invalid username or password.'], 401);
    }

    if (strtoupper($user->status) !== 'ACTIVE') {
        logAuditLog($user->user_code, $user->username, 'AUTHENTICATION', 'BLOCKED_LOGIN', 'Login attempt on inactive account: ' . $username, $request->ip());
        return response()->json(['error' => 'Account is currently inactive. Contact Administrator.'], 403);
    }

    $passwordMatches = \Illuminate\Support\Facades\Hash::check($password, $user->password) || $user->password === $password;
    if (!$passwordMatches) {
        logAuditLog($user->user_code, $user->username, 'AUTHENTICATION', 'FAILED_LOGIN', 'Invalid password attempt for user: ' . $username, $request->ip());
        return response()->json(['error' => 'Invalid username or password.'], 401);
    }

    // Auto-upgrade legacy plaintext password to secure hash on login
    if ($user->password === $password) {
        DB::table('tbl_web_users')->where('id', $user->id)->update([
            'password' => \Illuminate\Support\Facades\Hash::make($password),
            'updated_at' => now()
        ]);
    }

    $depts = DB::table('tbl_web_user_dept_access')
        ->where('user_code', $user->user_code)
        ->pluck('dept_code')
        ->toArray();

    $modules = DB::table('tbl_web_user_module_access')
        ->where('user_code', $user->user_code)
        ->pluck('module_key')
        ->toArray();

    $permissions = DB::table('tbl_web_role_permissions')
        ->where('role_code', $user->role_code)
        ->get();

    logAuditLog($user->user_code, $user->username, 'AUTHENTICATION', 'LOGIN', 'User logged in successfully', $request->ip());

    return response()->json([
        'message' => 'Login successful',
        'user' => [
            'user_code' => $user->user_code,
            'username' => $user->username,
            'full_name' => $user->full_name,
            'role_code' => $user->role_code,
            'role_name' => $user->role_name ?? $user->role_code,
            'phone' => $user->phone,
            'email' => $user->email,
            'discount_limit_percent' => floatval($user->discount_limit_percent ?? 10),
            'departments' => $depts,
            'modules' => $modules,
            'permissions' => $permissions
        ]
    ]);
});

// 1. Roles List
Route::get('/api/setup/roles', function () {
    $roles = DB::table('tbl_web_roles')->orderBy('id', 'asc')->get();
    return response()->json($roles);
});

// 2. Users List (with Department & Module Access)
Route::get('/api/setup/users', function () {
    $users = DB::table('tbl_web_users as u')
        ->leftJoin('tbl_web_roles as r', 'u.role_code', '=', 'r.role_code')
        ->select('u.*', 'r.role_name')
        ->orderBy('u.id', 'asc')
        ->get();

    $userList = $users->map(function ($u) {
        $depts = DB::table('tbl_web_user_dept_access as uda')
            ->leftJoin('MDepartment as md', 'uda.dept_code', '=', 'md.Code')
            ->where('uda.user_code', $u->user_code)
            ->select('uda.dept_code', DB::raw("COALESCE(RTRIM(md.Descr), uda.dept_name, uda.dept_code) as dept_name"))
            ->get();

        $modules = DB::table('tbl_web_user_module_access')
            ->where('user_code', $u->user_code)
            ->select('module_key', 'module_name')
            ->get();

        return [
            'id' => $u->id,
            'user_code' => $u->user_code,
            'username' => $u->username,
            'full_name' => $u->full_name,
            'role_code' => $u->role_code,
            'role_name' => $u->role_name ?? $u->role_code,
            'phone' => $u->phone,
            'email' => $u->email,
            'discount_limit_percent' => floatval($u->discount_limit_percent ?? 10),
            'status' => $u->status,
            'departments' => $depts,
            'modules' => $modules,
            'created_at' => $u->created_at ? (new DateTime($u->created_at))->format('d-M-Y') : ''
        ];
    });

    return response()->json($userList);
});

// 3. Create User
Route::post('/api/setup/users', function (Request $request) {
    $data = $request->validate([
        'username' => 'required|string',
        'password' => 'required|string',
        'full_name' => 'required|string',
        'role_code' => 'required|string',
        'phone' => 'nullable|string',
        'email' => 'nullable|string',
        'discount_limit_percent' => 'nullable|numeric',
        'departments' => 'nullable|array',
        'modules' => 'nullable|array'
    ]);

    $existing = DB::table('tbl_web_users')->where('username', $data['username'])->exists();
    if ($existing) {
        return response()->json(['error' => 'Username already exists.'], 400);
    }

    $maxCode = DB::table('tbl_web_users')->selectRaw("MAX(TRY_CAST(SUBSTRING(user_code, 2, LEN(user_code)) AS INT)) as max_num")->first();
    $nextNum = ($maxCode && $maxCode->max_num !== null) ? intval($maxCode->max_num) + 1 : 2;
    $userCode = 'U' . str_pad($nextNum, 7, '0', STR_PAD_LEFT);

    DB::transaction(function () use ($userCode, $data) {
        DB::table('tbl_web_users')->insert([
            'user_code' => $userCode,
            'username' => trim($data['username']),
            'password' => \Illuminate\Support\Facades\Hash::make(trim($data['password'])),
            'full_name' => trim($data['full_name']),
            'role_code' => $data['role_code'],
            'phone' => $data['phone'] ?? '',
            'email' => $data['email'] ?? '',
            'discount_limit_percent' => floatval($data['discount_limit_percent'] ?? 10),
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (!empty($data['departments'])) {
            foreach ($data['departments'] as $deptCode) {
                $deptObj = DB::table('MDepartment')->where('Code', $deptCode)->first();
                DB::table('tbl_web_user_dept_access')->insert([
                    'user_code' => $userCode,
                    'dept_code' => $deptCode,
                    'dept_name' => $deptObj ? trim($deptObj->Descr) : $deptCode,
                    'created_at' => now(),
                ]);
            }
        }

        if (!empty($data['modules'])) {
            foreach ($data['modules'] as $modKey) {
                DB::table('tbl_web_user_module_access')->insert([
                    'user_code' => $userCode,
                    'module_key' => $modKey,
                    'module_name' => $modKey,
                    'created_at' => now(),
                ]);
            }
        }
    });

    logAuditLog('ADMIN', 'ADMIN', 'USER_SETUP', 'USER_CREATED', 'Created new user account: ' . $data['username'] . ' (' . $userCode . ')', $request->ip());

    return response()->json(['message' => 'User created successfully', 'user_code' => $userCode]);
});

// 4. Update User
Route::post('/api/setup/users/update/{id}', function (Request $request, $id) {
    $user = DB::table('tbl_web_users')->where('id', $id)->first();
    if (!$user) {
        return response()->json(['error' => 'User not found.'], 404);
    }

    $data = $request->validate([
        'full_name' => 'required|string',
        'role_code' => 'required|string',
        'password' => 'nullable|string',
        'phone' => 'nullable|string',
        'email' => 'nullable|string',
        'discount_limit_percent' => 'nullable|numeric',
        'status' => 'nullable|string',
        'departments' => 'nullable|array',
        'modules' => 'nullable|array'
    ]);

    DB::transaction(function () use ($user, $data, $id) {
        $updateData = [
            'full_name' => trim($data['full_name']),
            'role_code' => $data['role_code'],
            'phone' => $data['phone'] ?? '',
            'email' => $data['email'] ?? '',
            'discount_limit_percent' => floatval($data['discount_limit_percent'] ?? 10),
            'status' => $data['status'] ?? 'ACTIVE',
            'updated_at' => now(),
        ];

        if (!empty($data['password'])) {
            $updateData['password'] = \Illuminate\Support\Facades\Hash::make(trim($data['password']));
        }

        DB::table('tbl_web_users')->where('id', $id)->update($updateData);

        // Sync department access
        DB::table('tbl_web_user_dept_access')->where('user_code', $user->user_code)->delete();
        if (!empty($data['departments'])) {
            foreach ($data['departments'] as $deptCode) {
                $deptObj = DB::table('MDepartment')->where('Code', $deptCode)->first();
                DB::table('tbl_web_user_dept_access')->insert([
                    'user_code' => $user->user_code,
                    'dept_code' => $deptCode,
                    'dept_name' => $deptObj ? trim($deptObj->Descr) : $deptCode,
                    'created_at' => now(),
                ]);
            }
        }

        // Sync module access
        DB::table('tbl_web_user_module_access')->where('user_code', $user->user_code)->delete();
        if (!empty($data['modules'])) {
            foreach ($data['modules'] as $modKey) {
                DB::table('tbl_web_user_module_access')->insert([
                    'user_code' => $user->user_code,
                    'module_key' => $modKey,
                    'module_name' => $modKey,
                    'created_at' => now(),
                ]);
            }
        }
    });

    logAuditLog('ADMIN', 'ADMIN', 'USER_SETUP', 'USER_UPDATED', 'Updated access permissions for user: ' . $user->username . ' (' . $user->user_code . ')', $request->ip());

    return response()->json(['message' => 'User updated successfully']);
});

// 5. Get Audit Logs
Route::get('/api/setup/audit-logs', function (Request $request) {
    $search = trim($request->input('search', ''));
    $query = DB::table('tbl_web_audit_logs');

    if (!empty($search)) {
        $query->where(function ($q) use ($search) {
            $q->where('username', 'LIKE', "%{$search}%")
              ->orWhere('module_name', 'LIKE', "%{$search}%")
              ->orWhere('action_type', 'LIKE', "%{$search}%")
              ->orWhere('description', 'LIKE', "%{$search}%");
        });
    }

    $logs = $query->orderBy('id', 'desc')->take(100)->get();

    $formatted = $logs->map(function ($l) {
        return [
            'id' => $l->id,
            'user_code' => $l->user_code ?? 'SYSTEM',
            'username' => $l->username ?? 'SYSTEM',
            'module_name' => $l->module_name,
            'action_type' => $l->action_type,
            'description' => $l->description,
            'ip_address' => $l->ip_address,
            'created_at' => $l->created_at ? (new DateTime($l->created_at))->format('d-M-Y h:i:s A') : ''
        ];
    });

    return response()->json($formatted);
});

// 5. Get Permission Matrix (Casting integer booleans for clean JSON)
Route::get('/api/setup/permissions', function () {
    $permissions = DB::table('tbl_web_role_permissions')->get()->map(function ($p) {
        $p->can_view = (int)$p->can_view;
        $p->can_add = (int)$p->can_add;
        $p->can_edit = (int)$p->can_edit;
        $p->can_delete = (int)$p->can_delete;
        $p->can_approve = (int)$p->can_approve;
        return $p;
    });
    return response()->json($permissions);
});

// 6. Save Permission Matrix (Batch Update & Insert)
Route::post('/api/setup/permissions', function (Request $request) {
    $matrix = $request->input('matrix', []);
    if (!is_array($matrix)) {
        return response()->json(['error' => 'Matrix array required.'], 400);
    }

    DB::transaction(function () use ($matrix) {
        foreach ($matrix as $item) {
            if (empty($item['role_code']) || empty($item['module_key'])) continue;
            DB::table('tbl_web_role_permissions')->updateOrInsert(
                [
                    'role_code' => $item['role_code'],
                    'module_key' => $item['module_key']
                ],
                [
                    'module_name' => $item['module_name'] ?? $item['module_key'],
                    'can_view' => !empty($item['can_view']) ? 1 : 0,
                    'can_add' => !empty($item['can_add']) ? 1 : 0,
                    'can_edit' => !empty($item['can_edit']) ? 1 : 0,
                    'can_delete' => !empty($item['can_delete']) ? 1 : 0,
                    'can_approve' => !empty($item['can_approve']) ? 1 : 0,
                    'created_at' => now(),
                ]
            );
        }
    });

    logAuditLog($request, 'PERMISSIONS_UPDATE', 'Updated global Role Permission Matrix grid permissions');

    return response()->json(['message' => 'Permission matrix updated successfully']);
});


// 3. Get Full Patient Clinical Report Payload (For Universal Print Engine)
Route::get('/api/lab/patient-full-report/{bookingId}', function ($bookingId) {
    $header = DB::table('tbl_web_booking_hdr')
        ->where('id', $bookingId)
        ->orWhere('booking_no', $bookingId)
        ->first();

    if (!$header) {
        return response()->json(['error' => 'Booking not found.'], 404);
    }

    $bId = $header->id;

    $details = DB::table('tbl_web_booking_dtl')
        ->where('booking_id', $bId)
        ->orWhere('booking_no', $header->booking_no)
        ->get();

    $testItems = $details->map(function ($item) {
        $resultJson = [];
        if (!empty($item->result_json)) {
            $resultJson = json_decode($item->result_json, true) ?? [];
        }
        return [
            'id' => $item->id,
            'test_code' => trim($item->test_code),
            'test_name' => trim($item->test_name),
            'dept_name' => trim($item->dept_name ?? 'UNKNOWN'),
            'test_status' => trim($item->test_status ?? 'PENDING'),
            'result_json' => $resultJson,
            'narrative_html' => $item->narrative_html,
            'result_entered_at' => $item->result_entered_at,
            'verified_at' => $item->verified_at
        ];
    });

    return response()->json([
        'header' => [
            'booking_id' => $bId,
            'booking_no' => trim($header->booking_no),
            'booking_date' => $header->booking_date,
            'patient_code' => trim($header->patient_code ?? ''),
            'patient_name' => trim($header->patient_name ?? ''),
            'patient_age' => trim(($header->age_year ?? '') . ' Yrs'),
            'patient_sex' => trim($header->sex ?? 'Male'),
            'patient_phone' => trim($header->mobile_no ?? ''),
            'doctor_name' => trim($header->doctor_name ?? 'SELF / DIRECT'),
            'doctor_qual' => ''
        ],
        'test_items' => $testItems
    ]);
});

// Get Lab Settings
Route::get('/api/setup/settings', function () {
    $settings = DB::table('tbl_web_settings')->orderBy('sort_order', 'asc')->get();
    $formatted = [];
    foreach ($settings as $s) {
        $val = $s->setting_value;
        if ($s->setting_type === 'json' && !empty($val)) {
            $val = json_decode($val, true) ?? $val;
        }
        $formatted[$s->setting_key] = [
            'key' => $s->setting_key,
            'value' => $val,
            'group' => $s->setting_group,
            'label' => $s->setting_label,
            'type' => $s->setting_type,
            'sort_order' => $s->sort_order
        ];
    }
    return response()->json([
        'settings' => $formatted,
        'raw' => $settings
    ]);
});

// Save Lab Settings
Route::post('/api/setup/settings', function (Request $request) {
    $settings = $request->input('settings', []);
    if (!is_array($settings)) {
        return response()->json(['error' => 'Settings array required.'], 400);
    }

    DB::transaction(function () use ($settings) {
        foreach ($settings as $key => $val) {
            $valueToStore = is_array($val) ? json_encode($val) : $val;
            DB::table('tbl_web_settings')
                ->where('setting_key', $key)
                ->update([
                    'setting_value' => $valueToStore,
                    'updated_at' => now()
                ]);
        }
    });

    logAuditLog($request, 'SETTINGS_UPDATE', 'Updated global Lab Identity & System Settings');

    return response()->json(['message' => 'Lab settings updated successfully']);
});
