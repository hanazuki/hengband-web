function(variant, icons)

  local _ = function(ja, en)
    if variant == 'ja' then ja else en;

  {
    '$schema': 'https://json.schemastore.org/web-manifest-combined.json',

    start_url: '/#%s' % [variant],
    id: '/',

    lang: variant,
    name: _('変愚蛮怒ブラウザ版', 'Hengband Web'),
    short_name: _('変愚蛮怒', 'Hengband'),
    description: _(
      '変愚蛮怒をブラウザで遊べます。インストールするとすべてのキー操作を利用可能です。オフラインでも遊べます。',
      'Play Hengband on your browser. Full keyboard control and offline play is available after installing the app.',
    ),
    categories: ['games'],

    display: 'standalone',
    launch_handler: { client_mode: 'focus-existing' },

    background_color: '#282A36',
    theme_color: '#282A36',

    icons: icons,
    screenshots: [
      {
        src: 'screenshots/%s.png' % [variant],
        sizes: '2494x1420',
        type: 'image/png',
        form_factor: 'wide',
        label: _('変愚蛮怒ブラウザ版のゲーム画面', 'Hengband Web gameplay'),
      },
    ],
  }
