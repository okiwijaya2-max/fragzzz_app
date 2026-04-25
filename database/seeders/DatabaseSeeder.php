<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        \Illuminate\Database\Eloquent\Model::unguard();

        \App\Models\Setting::create(['key' => 'mostSearchedCount', 'value' => '3']);

        $perfume = \App\Models\Perfume::create([
            'name' => 'Baccarat Rouge 540',
            'brand' => 'Maison Francis Kurkdjian',
            'image' => 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=600&q=80',
            'search_count' => 1500,
            'description' => 'A luminous and sophisticated fragrance.',
        ]);

        \App\Models\Dupe::create([
            'perfume_id' => $perfume->id,
            'name' => 'Cloud',
            'brand' => 'Ariana Grande',
            'price' => '$45',
            'image' => 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80',
            'buy_link' => 'https://example.com/buy-cloud'
        ]);

        \App\Models\Dupe::create([
            'perfume_id' => $perfume->id,
            'name' => 'In the Stars',
            'brand' => 'Bath & Body Works',
            'price' => '$15',
            'image' => 'https://images.unsplash.com/photo-1595532542520-50ca37e38cfa?auto=format&fit=crop&w=600&q=80',
            'buy_link' => 'https://example.com/buy-inthestars'
        ]);

        $perfume2 = \App\Models\Perfume::create([
            'name' => 'Tobacco Vanille',
            'brand' => 'Tom Ford',
            'image' => 'https://images.unsplash.com/photo-1610632380989-680fe40816c6?auto=format&fit=crop&w=600&q=80',
            'search_count' => 850,
            'description' => 'Opulent. Warm. Iconic.',
        ]);

        \App\Models\Dupe::create([
            'perfume_id' => $perfume2->id,
            'name' => 'Sweet Smoke',
            'brand' => 'Dossier',
            'price' => '$39',
            'image' => 'https://images.unsplash.com/photo-1563170351-be82bc888a97?auto=format&fit=crop&w=600&q=80',
            'buy_link' => 'https://example.com/buy'
        ]);

        \App\Models\Perfume::create([
            'name' => 'Santal 33',
            'brand' => 'Le Labo',
            'image' => 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80',
            'search_count' => 1200,
            'description' => 'A cult classic.',
        ]);

        \App\Models\Blog::create([
            'title' => 'Top 5 Dupes for Baccarat Rouge 540',
            'date' => '2026-04-10',
            'content' => "Baccarat Rouge 540 is incredibly popular but also very expensive. In this post, we explore exactly why it's so beloved and offer you 5 of the absolute best alternatives that won't break the bank. \n\n1. Ariana Grande Cloud\n2. Zara Red Temptation\n3. Lattafa Al Dur Al Maknoon\n4. Dossier Ambery Saffron\n5. Al Haramain Amber Oud Rouge"
        ]);

        \App\Models\Merch::create([
            'name' => 'Fragzzz Essential T-Shirt',
            'price' => '$25',
            'image' => 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
            'buy_link' => 'https://gumroad.com'
        ]);

        \App\Models\Merch::create([
            'name' => 'Smell Good Hoodie',
            'price' => '$45',
            'image' => 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80',
            'buy_link' => 'https://gumroad.com'
        ]);
    }
}
