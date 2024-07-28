import { promises as fs } from 'fs'
import path from 'path'

async function readPackageJson(filePath) {
  const data = await fs.readFile(filePath, 'utf8')
  return JSON.parse(data)
}

async function writePackageJson(filePath, content) {
  const data = JSON.stringify(content, null, 2)
  await fs.writeFile(filePath, data, 'utf8')
}

async function updateSubmoduleVersions() {
  const rootPackagePath = path.resolve('package.json')
  const rootPackageJson = await readPackageJson(rootPackagePath)
  const rootVersion = rootPackageJson.version

  const packagesDir = path.resolve('packages')
  const submodules = await fs.readdir(packagesDir, { withFileTypes: true })

  for (const dirent of submodules) {
    if (dirent.isDirectory()) {
      const submodulePackagePath = path.join(packagesDir, dirent.name, 'package.json')
      const submodulePackageJson = await readPackageJson(submodulePackagePath)

      if (submodulePackageJson.version !== rootVersion) {
        submodulePackageJson.version = rootVersion
        await writePackageJson(submodulePackagePath, submodulePackageJson)
        console.log(`Updated version in ${submodulePackagePath} to ${rootVersion}`)
      }
    }
  }
}

updateSubmoduleVersions().catch(error => {
  console.error('Error updating submodule versions:', error)
})
