<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paydunya' => [
        'master_key'  => env('PAYDUNYA_MASTER_KEY'),
        'public_key'  => env('PAYDUNYA_PUBLIC_KEY'),
        'private_key' => env('PAYDUNYA_PRIVATE_KEY'),
        'token'       => env('PAYDUNYA_TOKEN'),
        'mode'        => env('PAYDUNYA_MODE', 'test'),
    ],

    'soynade' => [
        'api_key'  => env('SOYNADE_API_KEY'),
        'base_url' => env('SOYNADE_BASE_URL', 'https://api.soynade.ai'),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model'   => env('GEMINI_MODEL', 'gemini-flash-latest'),
    ],

    'orange_sms' => [
        'driver'         => env('SMS_DRIVER', 'log'),
        'client_id'      => env('ORANGE_SMS_CLIENT_ID'),
        'client_secret'  => env('ORANGE_SMS_CLIENT_SECRET'),
        'sender_name'    => env('ORANGE_SMS_SENDER_NAME', 'TerangaRDV'),
        'sender_address' => env('ORANGE_SMS_SENDER_ADDRESS', 'tel:+2210000'),
    ],

];