// src/components/icons/ProfileIcon.js
import * as React from "react"
import Svg, { Defs, G, Path, Circle } from "react-native-svg"

// 1. Accolades { color, size, ...props } toegevoegd
const ProfileIcon = ({ color, size, ...props }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    id="Layer_2"
    data-name="Layer 2"
    viewBox="0 0 51.66 51.65"
    width={size}   // 2. Toegevoegd
    height={size}  // 3. Toegevoegd
    {...props}
  >
    <Defs></Defs>
    <G id="Layer_1-2" data-name="Layer 1">
      <Path
        d="M38.4 46.63a30.3 30.3 0 0 1-11.45 2.7c-6.29.23-11.16-1.56-13.69-2.7-.11 0-.7-.01-1.17-.49-.3-.3-.49-.72-.49-1.17v-7.1c0-5.3 4.29-9.59 9.59-9.59h9.29c5.3 0 9.59 4.29 9.59 9.59v7.1c0 .92-.74 1.66-1.66 1.66Z"
        fill={color}
      />
      <Circle cx={25.83} cy={18.94} r={8.43} fill={color} />
      <Path
        d="M25.83 51.65C11.59 51.65 0 40.07 0 25.83S11.59 0 25.83 0s25.83 11.59 25.83 25.83-11.59 25.83-25.83 25.83Zm0-45.65C14.89 6 6 14.89 6 25.83s8.89 19.83 19.83 19.83 19.83-8.89 19.83-19.83S36.76 6 25.83 6Z"
        fill={color}
      />
    </G>
  </Svg>
)
export default ProfileIcon