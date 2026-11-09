import Mapbox, { Camera, LineLayer, MapView, PointAnnotation, ShapeSource } from '@rnmapbox/maps';
import { Text, View } from 'react-native';
import type { Coordinate, RouteOption } from './types';

type Props = { routes: RouteOption[]; selectedRouteId: string; origin: Coordinate; destination: Coordinate; attribution?: string };

export function RouteMap({ routes, selectedRouteId, origin, destination, attribution = '© Mapbox' }: Props) {
  const points = routes.flatMap((option) => option.route.geometry.coordinates);
  const bounds = points.reduce((current, point) => ({
    minLongitude: Math.min(current.minLongitude, point[0]),
    minLatitude: Math.min(current.minLatitude, point[1]),
    maxLongitude: Math.max(current.maxLongitude, point[0]),
    maxLatitude: Math.max(current.maxLatitude, point[1]),
  }), {
    minLongitude: Math.min(origin[0], destination[0]),
    minLatitude: Math.min(origin[1], destination[1]),
    maxLongitude: Math.max(origin[0], destination[0]),
    maxLatitude: Math.max(origin[1], destination[1]),
  });

  return (
    <View className="h-[270px] overflow-hidden rounded-2xl border border-[#343945]">
      <MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Dark} logoEnabled compassEnabled>
        <Camera bounds={{ ne: [bounds.maxLongitude, bounds.maxLatitude], sw: [bounds.minLongitude, bounds.minLatitude], paddingTop: 40, paddingBottom: 40, paddingLeft: 40, paddingRight: 40 }} animationDuration={400} />
        {routes.map((option, index) => (
          <ShapeSource key={option.id} id={`route-${option.id}`} shape={option.route.geometry}>
            <LineLayer
              id={`route-line-${option.id}`}
              style={{
                lineColor: option.id === selectedRouteId ? '#d7b66a' : index === 0 ? '#39bde0' : '#f17c72',
                lineWidth: option.id === selectedRouteId ? 5 : 3,
                lineOpacity: option.id === selectedRouteId ? 1 : 0.65,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        ))}
        <PointAnnotation id="journey-origin" coordinate={origin}>
          <View className="h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#39bde0]" />
        </PointAnnotation>
        <PointAnnotation id="journey-destination" coordinate={destination}>
          <View className="h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#f17c72]"><Text className="text-[9px] font-bold text-white">D</Text></View>
        </PointAnnotation>
      </MapView>
      <Text className="absolute bottom-2 right-2 rounded bg-[#090d17]/80 px-2 py-1 text-[10px] text-[#f7f7f5]">{attribution}</Text>
    </View>
  );
}
