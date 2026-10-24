/* Тема 2, раздел 8 — файлови системи: имена, inode, връзки, дескриптори; разпределение на блокове.
 * Компилиране:  gcc -std=c11 -Wall -Wextra -O2 08_fs.c -o 08_fs && ./08_fs
 *
 * Учебен модел в стила на Unix: директорията съпоставя имена с номера на
 * inode; inode пази брой твърди връзки, брой отворени достъпи и данни.
 * Обектът се освобождава, когато и двата брояча станат 0.
 */
#include <stdio.h>
#include <string.h>

#define MAXI 8
#define MAXD 12
#define NAMEL 12

typedef struct { int used, nlink, nopen, is_symlink; char data[NAMEL]; } Inode;
typedef struct { char name[NAMEL]; int ino; } Dirent;
typedef struct { Inode in[MAXI]; Dirent d[MAXD]; int nd; int fd_ino[MAXD]; int nfd; int freed; } FS;

static int lookup(const FS *fs, const char *name)
{
    for (int i = 0; i < fs->nd; i++)
        if (strcmp(fs->d[i].name, name) == 0) return i;
    return -1;
}

static int new_inode(FS *fs)
{
    for (int i = 0; i < MAXI; i++)
        if (!fs->in[i].used) { memset(&fs->in[i], 0, sizeof fs->in[i]); fs->in[i].used = 1; return i; }
    return -1;
}

static void add_name(FS *fs, const char *name, int ino)
{
    snprintf(fs->d[fs->nd].name, NAMEL, "%s", name);
    fs->d[fs->nd++].ino = ino;
}

//#viz s08_inode
static void maybe_free(FS *fs, int ino)
{
    Inode *n = &fs->in[ino];
    if (n->nlink == 0 && n->nopen == 0) {        //@free
        n->used = 0;                             /* данните се освобождават */
        fs->freed++;
    }
}

static int fs_create(FS *fs, const char *name, const char *data)
{
    if (lookup(fs, name) >= 0) return -1;
    int ino = new_inode(fs);                     //@create
    if (ino < 0) return -1;
    snprintf(fs->in[ino].data, NAMEL, "%s", data);
    fs->in[ino].nlink = 1;
    add_name(fs, name, ino);                     //@name
    return ino;
}

static int fs_link(FS *fs, const char *old, const char *name)   /* твърда връзка */
{
    int e = lookup(fs, old);
    if (e < 0 || lookup(fs, name) >= 0) return -1;
    int ino = fs->d[e].ino;
    fs->in[ino].nlink++;                         //@link
    add_name(fs, name, ino);                     //@name
    return ino;
}

static int fs_symlink(FS *fs, const char *target, const char *name)
{
    if (lookup(fs, name) >= 0) return -1;
    int ino = new_inode(fs);                     //@symlink
    if (ino < 0) return -1;
    fs->in[ino].is_symlink = 1;
    fs->in[ino].nlink = 1;
    snprintf(fs->in[ino].data, NAMEL, "%s", target);  /* пази ПЪТ, не inode */
    add_name(fs, name, ino);                     //@name
    return ino;
}

static int fs_unlink(FS *fs, const char *name)
{
    int e = lookup(fs, name);
    if (e < 0) return -1;
    int ino = fs->d[e].ino;
    fs->d[e] = fs->d[--fs->nd];                  //@unlink
    fs->in[ino].nlink--;
    maybe_free(fs, ino);
    return 0;
}

/* Отваряне: следва символна връзка (едно ниво). Връща дескриптор или -1. */
static int fs_open(FS *fs, const char *name)
{
    int e = lookup(fs, name);
    if (e < 0) return -1;                        //@noent
    int ino = fs->d[e].ino;
    if (fs->in[ino].is_symlink) {                //@follow
        e = lookup(fs, fs->in[ino].data);
        if (e < 0) return -1;                    /* висяща връзка */ //@dangling
        ino = fs->d[e].ino;
    }
    fs->in[ino].nopen++;                         //@open
    fs->fd_ino[fs->nfd] = ino;
    return fs->nfd++;
}

static void fs_close(FS *fs, int fd)
{
    int ino = fs->fd_ino[fd];
    if (ino < 0) return;
    fs->fd_ino[fd] = -1;
    fs->in[ino].nopen--;                         //@close
    maybe_free(fs, ino);
}
//#end

/* Сценарий: команди, разделени с ';' — c име данни | l старо ново | s цел име | u име | o име | x fd */
static void scenario(const char *nm, const char *script)
{
    FS fs;
    memset(&fs, 0, sizeof fs);
    char buf[256];
    snprintf(buf, sizeof buf, "%s", script);
    int fails = 0, lastfd = -1;
    for (char *tok = strtok(buf, ";"); tok; tok = strtok(NULL, ";")) {
        char op, a[NAMEL] = "", b[NAMEL] = "";
        while (*tok == ' ') tok++;
        if (sscanf(tok, "%c %11s %11s", &op, a, b) < 2) continue;
        int r = 0;
        switch (op) {
        case 'c': r = fs_create(&fs, a, b); break;
        case 'l': r = fs_link(&fs, a, b); break;
        case 's': r = fs_symlink(&fs, a, b); break;
        case 'u': r = fs_unlink(&fs, a); break;
        case 'o': r = lastfd = fs_open(&fs, a); break;
        case 'x': {
            int fd = 0;
            sscanf(a, "%d", &fd);
            if (fd >= 0 && fd < fs.nfd) fs_close(&fs, fd); else r = -1;
            break;
        }
        }
        if (r < 0) fails++;
    }
    int live = 0;
    for (int i = 0; i < MAXI; i++) live += fs.in[i].used;
    printf("%s.names = %d\n%s.inodes = %d\n%s.freed = %d\n%s.fails = %d\n%s.lastfd = %d\n",
           nm, fs.nd, nm, live, nm, fs.freed, nm, fails, nm, lastfd);
}

/* ---------------- разпределение на блокове ---------------- */
#define DISK 32
enum { CONTIG, LINKED, INDEXED };

//#viz s08_alloc
/* Брой четения от диска, за да се стигне до логически блок k на файла. */
static int reads_to_block(int method, int k)
{
    switch (method) {
    case CONTIG:  return 1;          /* адрес = начало + k */         //@contig
    case LINKED:  return k + 1;      /* следваме k указателя */       //@linked
    case INDEXED: return 2;          /* индексен блок + блок с данни */ //@indexed
    }
    return -1;
}

/* Разполага файл от n блока върху диска (used[] = 1 за заети). */
static int place(int method, int *used, int n, int *blocks, int *index_blk)
{
    *index_blk = -1;
    if (method == CONTIG) {                          /* търси n поредни */
        for (int s = 0; s + n <= DISK; s++) {
            int ok = 1;
            for (int i = 0; i < n; i++) if (used[s + i]) { ok = 0; break; }
            if (ok) {                                                 //@cfit
                for (int i = 0; i < n; i++) { used[s + i] = 1; blocks[i] = s + i; }
                return 0;
            }
        }
        return -1;                                   /* външна фрагментация */ //@cfail
    }
    int need = n + (method == INDEXED ? 1 : 0), got = 0, tmp[DISK];
    for (int b = 0; b < DISK && got < need; b++) if (!used[b]) tmp[got++] = b;  //@scatter
    if (got < need) return -1;
    int off = 0;
    if (method == INDEXED) { *index_blk = tmp[0]; used[tmp[0]] = 1; off = 1; } //@iblock
    for (int i = 0; i < n; i++) { blocks[i] = tmp[i + off]; used[blocks[i]] = 1; }
    return 0;
}
//#end

static void alloc_run(const char *nm, int method, const char *busy, int n, int k)
{
    int used[DISK] = {0}, blocks[DISK], ib;
    for (int i = 0; i < DISK && busy[i]; i++) used[i] = busy[i] == '#';
    int r = place(method, used, n, blocks, &ib);
    printf("%s.ok = %d\n", nm, r == 0);
    if (r == 0) {
        printf("%s.blocks = ", nm);
        for (int i = 0; i < n; i++) printf("%s%d", i ? "," : "", blocks[i]);
        printf("\n%s.index = %d\n%s.reads = %d\n", nm, ib, nm, reads_to_block(method, k));
    }
}

#ifndef NO_MAIN
int main(void)
{
    scenario("hard", "c a.txt hello; l a.txt b.txt; u a.txt; o b.txt");
    scenario("sym", "c a.txt hello; s a.txt s.lnk; u a.txt; o s.lnk");
    scenario("open", "c a.txt hello; o a.txt; u a.txt; x 0");
    scenario("both", "c f x; l f g; o g; u f; u g; x 0; o g");

    const char *disk = "##..#...##.###.....#..##.#......";
    const char *mn[] = {"contig", "linked", "indexed"};
    for (int m = 0; m < 3; m++) {
        char nm[32];
        snprintf(nm, sizeof nm, "d5.%s", mn[m]);
        alloc_run(nm, m, disk, 5, 3);
        snprintf(nm, sizeof nm, "d8.%s", mn[m]);
        alloc_run(nm, m, disk, 8, 7);
    }
    return 0;
}
#endif
