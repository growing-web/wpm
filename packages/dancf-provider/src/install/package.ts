export interface ExactPackage {
  registry: string;
  name: string;
  version: string;
}

export interface LatestPackageTarget {
  registry: string;
  name: string;
  range: any;
}

export function pkgToStr (pkg: ExactPackage) {
  return `${pkg.registry ? pkg.registry + ':' : ''}${pkg.name}${pkg.version ? '@' + pkg.version : ''}`;
}
