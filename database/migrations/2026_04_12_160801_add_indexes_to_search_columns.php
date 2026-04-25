<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddIndexesToSearchColumns extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('perfumes', function (Blueprint $table) {
            $table->index('name');
            $table->index('brand');
        });

        Schema::table('blogs', function (Blueprint $table) {
            $table->index('title');
        });

        Schema::table('merches', function (Blueprint $table) {
            $table->index('name');
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
            $table->dropIndex(['name']);
            $table->dropIndex(['brand']);
        });

        Schema::table('blogs', function (Blueprint $table) {
            $table->dropIndex(['title']);
        });

        Schema::table('merches', function (Blueprint $table) {
            $table->dropIndex(['name']);
        });
    }
}
