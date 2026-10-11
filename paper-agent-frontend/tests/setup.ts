import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom 未实现 Blob 下载所需的 createObjectURL，也没实现 scrollIntoView（证据锚点定位）
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock';
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => undefined;
}
Element.prototype.scrollIntoView = () => undefined;

// jsdom 不实现 <a download> 的下载导航，只会在控制台留下 "Not implemented: navigation" 噪音
const anchorClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
  if (this.hasAttribute('download')) return;
  anchorClick.call(this);
};

afterEach(cleanup);
