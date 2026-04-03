import React, { useState } from "react";
import FPChatApp from "./fp-chat/FPChatApp";
import "./App.css";

function App() {
  const userId = '333';

  return <FPChatApp userId={userId} />;
}

export default App;
