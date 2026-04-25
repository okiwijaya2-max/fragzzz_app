<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AdjustPerfumesAndDupesTables extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('perfumes', function (Blueprint $table) {
            $table->string('top_notes')->nullable();
            $table->string('middle_notes')->nullable();
            $table->string('base_notes')->nullable();
        });

        Schema::table('dupes', function (Blueprint $table) {
            $table->string('buy_link_indo')->nullable();
            $table->string('video_1')->nullable();
            $table->string('video_2')->nullable();
            $table->string('video_3')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('perfumes', function (Blueprint $table) {
            $table->dropColumn(['top_notes', 'middle_notes', 'base_notes']);
        });

        Schema::table('dupes', function (Blueprint $table) {
            $table->dropColumn(['buy_link_indo', 'video_1', 'video_2', 'video_3']);
        });
    }
}
