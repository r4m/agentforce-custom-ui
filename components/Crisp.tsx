"use client"

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

const CrispChat = () => {
  useEffect(() => {
    Crisp.configure("095c3ea3-a473-44d1-9485-5aff3c1477c2");
  });

  return null;
}

export default CrispChat;