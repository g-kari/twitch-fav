# Chrome Web Store提出チェックリスト

## 用意済みの内容

- MV3、権限はstorageのみ、content scriptは https://www.twitch.tv/* のみ
- `npm run package`: 型・lint・単体テスト・本番ビルド後、`artifacts/twitch-favorites-v1.0.1.zip`を作成
- `npm run test:browser`: 合成データによるオフラインChrome画面テスト（`CHROME_PATH`で実行ファイル指定）
- `public/privacy.html`: パッケージに同梱するポリシー。Web Storeには同じ内容の公開HTTPS URLが必要

## 掲載文案

名前: Twitch Favorites
概要: Twitchのフォロー中チャンネルをお気に入りと並び順で整理。設定をJSONでバックアップ・復元できます。

Twitchのサイドバーにお気に入り操作を追加し、お気に入りチャンネルを上に表示します。同じグループ内をドラッグで並べ替え、設定画面ではボタンでも順序を変更できます。設定はブラウザ内に保存し、JSONでエクスポート・インポートできます。

Twitch非公式の拡張機能です。Twitchの画面構成の変更や表示状態によって利用できない場合があります。

単一目的: Twitchサイドバーのフォロー中チャンネルを、お気に入りとカスタム順序で整理し、設定をバックアップ・復元する。
storageの用途: お気に入り、並び順と対応するチャンネル名をローカルに保存する。
サイトアクセスの用途: Twitchサイドバーのチャンネル項目を読み、お気に入り操作と並べ替えを提供する。

## 本人・実環境で確認が必要

- 対象の開発者アカウントと既存掲載の有無。新規なら登録料（公式案内5米ドル、実際の総額を画面で確認）、契約承諾、連絡先メール確認、2段階認証
- Trader/Non-Traderの正しい申告。Traderの本人/住所等公開は独断で行わない
- プライバシーポリシーの公開URLと、最終実装に一致するデータ取扱い申告
- 実インストール後、Twitchのログイン状態・展開/折りたたみ・SPA遷移・複数タブ・リロード・保存復元を確認
- 実際の使用画面スクリーンショット1枚以上（1280×800推奨、640×400も可、最大5枚）、440×280プロモーション画像。合成fixture画像を実Twitch動作の証拠として使わない
- 同梱128×128 PNGアイコンを確認
- 審査提出後、審査中・承認・一般公開を区別し、公開URLで一般公開を確認

## 公式根拠（2026-10-06確認）

- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq
- https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code
