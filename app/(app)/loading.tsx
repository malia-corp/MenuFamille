import { LogoLoaderScreen } from '@/components/brand/logo-loader'

// Ouverture de l'app et passage d'une page à l'autre, tant que le serveur
// prépare la page : le logo animé. La page affiche ensuite son squelette
// le temps de charger ses données.
export default function AppLoading() {
  return <LogoLoaderScreen />
}
