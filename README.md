# Twitch Favorites

Chrome拡張機能：Twitchのサイドバーの配信者一覧を並び替えおよびお気に入り管理ができます。

## 機能

- お気に入り機能：配信者の名前の横に⭐アイコンが表示され、クリックするとお気に入りに追加できます
- ドラッグドロップによる並び替え機能：配信者の順序を変更できます
- 設定ファイルのJSONエクスポート機能：お気に入りと順序の設定をJSONファイルとして保存できます
- 設定ファイルのJSONインポート機能：保存した設定を読み込むことができます

## 開発

このプロジェクトはTypeScriptで開発されています。

### 開発環境のセットアップ

```bash
# 依存関係のインストール
npm ci --ignore-scripts

# 開発モードでビルド（ファイル変更を監視）
npm run dev

# 本番用にビルド
npm run build

# Chrome Web Store用のパッケージを作成
npm run package
```

### 拡張機能のインストール方法

1. `npm run build` でプロジェクトをビルドします
2. Chromeで `chrome://extensions` を開きます
3. 「デベロッパーモード」を有効にします
4. 「パッケージ化されていない拡張機能を読み込む」をクリックします
5. このプロジェクトの `dist` ディレクトリを選択します

### Chrome Web Storeに公開する方法

1. `npm run package` を実行してZIPファイルを作成します
2. [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/) にアクセスします
3. 「新しい項目を追加」をクリックします
4. 作成されたZIPファイル（`artifacts/twitch-favorites-v1.0.1.zip`）をアップロードします
5. 以下の情報を入力します：
   - 説明文
   - スクリーンショット（最低1枚、1280×800推奨）
   - プロモーション画像
   - カテゴリ（「生産性」または「ソーシャル＆コミュニケーション」が適切）
   - 言語設定
6. 「公開」ボタンをクリックして審査に提出します

### リリース方法

1. package.jsonのバージョンを更新します（例：`"version": "1.0.1"`）
2. 変更をコミットしてプッシュします
3. 新しいバージョンのタグを作成してプッシュします：
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
4. GitHub Actionsが型・lint・テスト・ビルド・Chrome fixtureを検証し、GitHubのdraftリリースを作成します
5. 作成されたリリースからZIPファイルをダウンロードしてChrome Web Storeにアップロードできます

## 使い方

1. Twitchのウェブサイト（https://www.twitch.tv/）にアクセスします
2. サイドバーの「フォロー中のチャンネル」セクションに各配信者の名前の横に⭐アイコンが表示されます
3. ⭐をクリックするとお気に入りに追加され、サイドバーの一番上に移動します
4. 配信者のリストをドラッグ＆ドロップして順序を変更できます
5. 拡張機能のポップアップから設定のエクスポート/インポートが可能です

## 品質確認・現在の制約

Node.js 22.20以降（CIは24）を使用してください。依存追加はありません。

```bash
npm run typecheck
npm run lint
npm test
npm run package
# Chrome/Chromiumを導入済みの環境（Linux既定は/usr/bin/chromium）
CHROME_PATH=/usr/bin/google-chrome npm run test:browser
```

画面テストは合成データによるオフラインfixtureです。実際のTwitchにログインした検証やWeb Storeへの申請を代替しません。公開の残項目は [提出チェックリスト](docs/STORE_SUBMISSION.md) を参照してください。

- インポートは確認後に設定全体を置換します。必要なら先にエクスポートしてください。上限は1MiB・5,000件です。
- お気に入りグループと通常グループの間のドラッグはできません。先に★でグループを切り替えます。
- 設定画面には上下移動ボタンと全初期化を用意しています。
- 1.0.1はアバター画像を取得しません。旧バックアップの画像URLや余分な項目は読み込み時に除きます。
- 保存はMV3 service workerで直列化し、タブ間で反映します。権限はstorageだけです。
- 旧版ZIPは過去の配布物です。最新の提出には必ず`npm run package`の成果物を使ってください。
