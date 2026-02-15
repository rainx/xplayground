cask "xtoolbox" do
  version "0.1.0"

  if Hardware::CPU.intel?
    sha256 "8c2b224853aad4ac5fb34f3eb55b86978aea696f8ac2d56af1d3004562397036"
    url "https://github.com/rainx/xplayground/releases/download/v#{version}/xToolbox-#{version}-mac-x64.zip"
  else
    sha256 "f8194114d6788b695f014383e8072d6483d9222a266dcb7a00a3992d465edaf8"
    url "https://github.com/rainx/xplayground/releases/download/v#{version}/xToolbox-#{version}-mac-arm64.zip"
  end

  name "xToolbox"
  desc "Personal Mac toolbox - clone useful features from paid apps"
  homepage "https://github.com/rainx/xplayground"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "xToolbox.app"

  postflight do
    # Remove quarantine attribute to avoid "damaged app" warning
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/xToolbox.app"]
  end

  zap trash: [
    "~/Library/Application Support/xtoolbox",
    "~/Library/Preferences/com.rainx.xtoolbox.plist",
    "~/Library/Logs/xtoolbox",
  ]
end
