<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('tbl_web_booking_hdr')) {
            Schema::create('tbl_web_booking_hdr', function (Blueprint $table) {
                $table->id();
                $table->string('booking_no', 30)->unique();
                $table->integer('serial_no');
                $table->string('fin_year', 10)->default('26-27');
                $table->dateTime('booking_date')->useCurrent();
                $table->string('patient_code', 30)->nullable();
                $table->string('patient_prefix', 10)->nullable();
                $table->string('patient_name', 100);
                $table->string('sex', 10)->nullable();
                $table->integer('age_year')->nullable();
                $table->integer('age_month')->nullable();
                $table->integer('age_day')->nullable();
                $table->string('mobile_no', 20)->nullable();
                $table->string('address', 200)->nullable();
                $table->string('doctor_code', 30)->nullable();
                $table->string('doctor_name', 100)->nullable();
                $table->string('category_code', 30)->nullable();
                $table->string('collector_code', 30)->nullable();
                $table->decimal('subtotal_amount', 18, 2)->default(0.00);
                $table->string('discount_type', 10)->default('percent');
                $table->decimal('discount_value', 18, 2)->default(0.00);
                $table->decimal('net_amount', 18, 2)->default(0.00);
                $table->decimal('paid_amount', 18, 2)->default(0.00);
                $table->decimal('due_amount', 18, 2)->default(0.00);
                $table->string('payment_method', 20)->default('Cash');
                $table->string('booking_status', 20)->default('ACTIVE');
                $table->dateTime('created_at')->useCurrent();
                $table->string('created_by', 50)->default('Admin');
            });
        }

        if (!Schema::hasTable('tbl_web_booking_dtl')) {
            Schema::create('tbl_web_booking_dtl', function (Blueprint $table) {
                $table->id();
                $table->foreignId('booking_id')->constrained('tbl_web_booking_hdr')->onDelete('cascade');
                $table->string('test_code', 30);
                $table->string('test_name', 150);
                $table->decimal('amount', 18, 2)->default(0.00);
                $table->string('dept_code', 30)->nullable();
                $table->string('dept_name', 100)->nullable();
                $table->string('sample_status', 30)->default('PENDING');
                $table->dateTime('sample_collected_at')->nullable();
                $table->string('sample_collected_by', 50)->nullable();
                $table->dateTime('dept_received_at')->nullable();
                $table->string('test_status', 30)->default('PENDING');
                $table->text('result_json')->nullable();
                $table->string('result_flag', 20)->default('NORMAL');
                $table->dateTime('result_entered_at')->nullable();
                $table->string('result_entered_by', 50)->nullable();
                $table->dateTime('verified_at')->nullable();
                $table->string('verified_by', 50)->nullable();
            });
        } else {
            Schema::table('tbl_web_booking_dtl', function (Blueprint $table) {
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'sample_status')) $table->string('sample_status', 30)->default('PENDING');
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'sample_collected_at')) $table->dateTime('sample_collected_at')->nullable();
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'sample_collected_by')) $table->string('sample_collected_by', 50)->nullable();
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'dept_code')) $table->string('dept_code', 30)->nullable();
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'dept_name')) $table->string('dept_name', 100)->nullable();
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'dept_received_at')) $table->dateTime('dept_received_at')->nullable();
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'test_status')) $table->string('test_status', 30)->default('PENDING');
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'result_json')) $table->text('result_json')->nullable();
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'result_flag')) $table->string('result_flag', 20)->default('NORMAL');
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'result_entered_at')) $table->dateTime('result_entered_at')->nullable();
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'result_entered_by')) $table->string('result_entered_by', 50)->nullable();
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'verified_at')) $table->dateTime('verified_at')->nullable();
                if (!Schema::hasColumn('tbl_web_booking_dtl', 'verified_by')) $table->string('verified_by', 50)->nullable();
            });
        }

        if (!Schema::hasTable('tbl_web_payments')) {
            Schema::create('tbl_web_payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('booking_id')->constrained('tbl_web_booking_hdr')->onDelete('cascade');
                $table->string('receipt_no', 30);
                $table->dateTime('payment_date')->useCurrent();
                $table->decimal('amount', 18, 2)->default(0.00);
                $table->string('payment_mode', 20)->default('Cash');
                $table->string('payment_type', 20)->default('ADVANCE');
                $table->string('created_by', 50)->default('Admin');
            });
        }

        if (!Schema::hasTable('tbl_web_invoice_hdr')) {
            Schema::create('tbl_web_invoice_hdr', function (Blueprint $table) {
                $table->id();
                $table->string('invoice_no', 30)->unique();
                $table->integer('serial_no');
                $table->string('fin_year', 10)->default('26-27');
                $table->foreignId('booking_id')->constrained('tbl_web_booking_hdr');
                $table->string('booking_no', 30);
                $table->dateTime('invoice_date')->useCurrent();
                $table->string('patient_code', 30)->nullable();
                $table->string('patient_name', 100);
                $table->decimal('subtotal_amount', 18, 2)->default(0.00);
                $table->decimal('discount_value', 18, 2)->default(0.00);
                $table->decimal('net_amount', 18, 2)->default(0.00);
                $table->decimal('paid_amount', 18, 2)->default(0.00);
                $table->decimal('due_amount', 18, 2)->default(0.00);
                $table->string('invoice_status', 20)->default('FULLY PAID');
                $table->dateTime('created_at')->useCurrent();
                $table->string('created_by', 50)->default('Admin');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tbl_web_invoice_hdr');
        Schema::dropIfExists('tbl_web_payments');
        Schema::dropIfExists('tbl_web_booking_dtl');
        Schema::dropIfExists('tbl_web_booking_hdr');
    }
};
