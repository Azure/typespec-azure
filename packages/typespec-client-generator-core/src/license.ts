import { LicenseInfo, TCGCContext } from "./interfaces.js";

export const licenseMap: { [key: string]: LicenseInfo } = {
  "MIT License": {
    name: "MIT License",
    link: "https://mit-license.org",
    company: "",
    header: `Copyright (c) <company>. All rights reserved.\n
Licensed under the MIT License.`,
    description: `Copyright (c) <company>\n
\n
Permission is hereby granted, free of charge, to any person obtaining a copy\n
of this software and associated documentation files (the “Software”), to deal\n
in the Software without restriction, including without limitation the rights\n
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n
copies of the Software, and to permit persons to whom the Software is\n
furnished to do so, subject to the following conditions:\n
\n
The above copyright notice and this permission notice shall be included in\n
all copies or substantial portions of the Software.\n
\n
THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\n
THE SOFTWARE.\n`,
  },
  "Apache License 2.0": {
    name: "Apache License 2.0",
    link: "https://www.apache.org/licenses/LICENSE-2.0",
    company: "",
    header: `Copyright (c) <company>. All rights reserved.\n
Licensed under the Apache License, Version 2.0.`,
    description: `Copyright (c) <company>\n
\n
Licensed under the Apache License, Version 2.0 (the "License");\n
you may not use this file except in compliance with the License.\n
You may obtain a copy of the License at\n
\n
    http://www.apache.org/licenses/LICENSE-2.0\n
\n
Unless required by applicable law or agreed to in writing, software\n
distributed under the License is distributed on an "AS IS" BASIS,\n
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n
See the License for the specific language governing permissions and\n
limitations under the License.\n`,
  },
  "BSD 3-Clause License": {
    name: "BSD 3-Clause License",
    link: "https://opensource.org/licenses/BSD-3-Clause",
    company: "",
    header: `Copyright (c) <company>. All rights reserved.\n
Licensed under the BSD 3-Clause License.`,
    description: `Copyright (c) <company>\n
\n
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:\n
\n
1. Redistributions of source code must retain the above copyright notice,\n
   this list of conditions and the following disclaimer.\n
\n
2. Redistributions in binary form must reproduce the above copyright\n
   notice, this list of conditions and the following disclaimer in the\n
   documentation and/or other materials provided with the distribution.\n
\n
3. Neither the name of the copyright holder nor the\n
   names of its contributors may be used to endorse or promote products\n
   derived from this software without specific prior written permission.\n
\n
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n`,
  },
  "MPL 2.0": {
    name: "MPL 2.0",
    link: "https://www.mozilla.org/en-US/MPL/2.0/",
    company: "",
    header: `Copyright (c) <company>. All rights reserved.\n
Licensed under the Mozilla Public License, v. 2.0.`,
    description: `Copyright (c) <company>\n
\n
This Source Code Form is subject to the terms of the Mozilla Public\n
License, v. 2.0. If a copy of the MPL was not distributed with this\n
file, You can obtain one at https://mozilla.org/MPL/2.0/.\n`,
  },
  "GPL-3.0": {
    name: "GPL-3.0",
    link: "https://www.gnu.org/licenses/gpl-3.0.html",
    company: "",
    header: `Copyright (c) <company>. All rights reserved.\n
Licensed under the version 3 of the GNU General Public License.`,
    description: `Copyright (c) <company>\n
\n
This program is free software: you can redistribute it and/or modify\n
it under the terms of the GNU General Public License as published by\n
the Free Software Foundation, either version 3 of the License, or\n
(at your option) any later version.\n
\n
This program is distributed in the hope that it will be useful,\n
but WITHOUT ANY WARRANTY; without even the implied warranty of\n
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n
GNU General Public License for more details.\n
\n
You should have received a copy of the GNU General Public License\n
along with this program.  If not, see <https://www.gnu.org/licenses/>.\n`,
  },
  "LGPL-3.0": {
    name: "LGPL-3.0",
    link: "https://www.gnu.org/licenses/lgpl-3.0.html",
    company: "",
    header: `Copyright (c) <company>. All rights reserved.\n
Licensed under the version 3 of the GNU Lesser General Public License.`,
    description: `Copyright (c) <company>\n
\n
This program is free software: you can redistribute it and/or modify\n
it under the terms of the GNU Lesser General Public License as published by\n
the Free Software Foundation, either version 3 of the License, or\n
(at your option) any later version.\n
\n
This program is distributed in the hope that it will be useful,\n
but WITHOUT ANY WARRANTY; without even the implied warranty of\n
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n
GNU Lesser General Public License for more details.\n
\n
You should have received a copy of the GNU Lesser General Public License\n
along with this program.  If not, see <https://www.gnu.org/licenses/>.\n`,
  },
};

export function getLicenseInfo(context: TCGCContext): LicenseInfo | undefined {
  if (!context.license) {
    return undefined;
  }

  // if license name is not preset in TCGC, we will use user's config
  if (!Object.keys(licenseMap).includes(context.license.name)) {
    return {
      name: context.license.name,
      company: context.license.company ?? "",
      link: context.license.link ?? "",
      header: context.license.header ?? "",
      description: context.license.description ?? "",
    };
  }

  // use preset license info if no user customization
  const licenseInfo = licenseMap[context.license.name];
  return {
    name: licenseInfo.name,
    company: context.license.company ?? "",
    link: context.license.link ?? licenseInfo.link,
    header:
      context.license.header ??
      licenseInfo.header.replace("<company>", context.license.company ?? ""),
    description:
      context.license.description ??
      licenseInfo.description.replace("<company>", context.license.company ?? ""),
  };
}
