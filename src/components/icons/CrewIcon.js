import * as React from "react"
import Svg, { Defs, G, Path } from "react-native-svg"

// 1. Let op de accolades { color, size } !
const CrewIcon = ({ color, size, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    id="Layer_2"
    data-name="Layer 2"
    viewBox="0 0 82.74 45.66"
    width={size}   // 2. Toegevoegd zodat hij de juiste grootte krijgt!
    height={size}  // 3. Toegevoegd zodat hij de juiste grootte krijgt!
    {...props}
  >
    <Defs></Defs>
    <G id="Layer_1-2" data-name="Layer 1">
      <Path
        d="m18.9 38.9-.03 6.76H0c1.46-13.87 11.29-18.33 22.3-15.82-1.84 2.13-3.52 6.33-3.39 9.06Z"
        fill={color} // Nu is dit écht alleen de kleurcode!
      />
      <Path
        d="M8.24 19.34c.18 10.83 16.29 10.82 16.47 0-.18-10.83-16.29-10.82-16.47 0ZM58.63 45.66h-38v-6.42c0-7.55 5.53-13.69 12.32-13.69H49.8c6.79 0 12.32 6.14 12.32 13.69v6.42h-3.48ZM26.72 38.9h29.3c-.16-3.66-2.89-6.59-6.23-6.59H32.94c-3.34 0-6.07 2.93-6.23 6.59ZM41.37 22.91c-6.32 0-11.46-5.14-11.46-11.46S35.05 0 41.37 0s11.46 5.14 11.46 11.46-5.14 11.46-11.46 11.46Zm0-16.15c-2.59 0-4.7 2.11-4.7 4.7s2.11 4.7 4.7 4.7 4.7-2.11 4.7-4.7-2.11-4.7-4.7-4.7Z"
        fill={color}
      />
      <Path
        d="m63.83 38.9.03 6.76h18.87c-1.46-13.87-11.29-18.33-22.3-15.82 1.84 2.13 3.52 6.33 3.39 9.06Z"
        fill={color}
      />
      <Path
        d="M74.5 19.34c-.18 10.83-16.29 10.82-16.47 0 .18-10.83 16.29-10.82 16.47 0Z"
        fill={color}
      />
    </G>
  </Svg>
)

export default CrewIcon